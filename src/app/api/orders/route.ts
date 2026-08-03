import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOrderSchema } from "@/lib/validation/order";
import { jsonError, zodErrorResponse } from "@/lib/apiError";
import { rateLimit, clientKeyFromRequest } from "@/lib/rateLimit";
import { generateOrderNumber } from "@/lib/orderNumber";
import { effectivePrice } from "@/lib/money";
import { getSettings, SETTING_KEYS, type BankDetails } from "@/lib/settings";
import { getCustomerSessionFromRequest } from "@/lib/auth";

// POST /api/orders — creates an order. Re-validates stock and prices
// server-side (never trusts client-submitted amounts) and decrements stock
// atomically so two simultaneous checkouts cannot oversell the last unit.

class OutOfStockError extends Error {
  constructor(public productName: string, public size: string) {
    super(`${productName} (${size}) is no longer available in the requested quantity`);
  }
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(`order:${clientKeyFromRequest(request)}`, 8, 60_000);
  if (!limited.allowed) return jsonError("Too many requests, please try again shortly", 429);

  const body = await request.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const input = parsed.data;

  // Merge duplicate lines for the same variant so we never issue two
  // concurrent decrements for one row inside the same transaction.
  const mergedItems = new Map<string, number>();
  for (const item of input.items) {
    mergedItems.set(item.variantId, (mergedItems.get(item.variantId) || 0) + item.qty);
  }

  const settings = await getSettings([SETTING_KEYS.SHIPPING_FEE, SETTING_KEYS.FREE_SHIPPING_THRESHOLD, SETTING_KEYS.BANK_DETAILS]);
  const shippingFeeSetting = settings[SETTING_KEYS.SHIPPING_FEE] as number;
  const freeShippingThreshold = settings[SETTING_KEYS.FREE_SHIPPING_THRESHOLD] as number;
  const bankDetails = settings[SETTING_KEYS.BANK_DETAILS] as BankDetails;

  const customer = getCustomerSessionFromRequest(request);

  try {
    const order = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const orderItemsData: {
        productId: string;
        variantId: string;
        productName: string;
        size: string;
        unitPrice: number;
        qty: number;
      }[] = [];

      for (const [variantId, qty] of mergedItems) {
        const variant = await tx.variant.findUnique({
          where: { id: variantId },
          include: { product: true },
        });
        if (!variant || !variant.product.isActive) {
          throw new OutOfStockError("Item", "");
        }

        const decremented = await tx.variant.updateMany({
          where: { id: variantId, stockQty: { gte: qty } },
          data: { stockQty: { decrement: qty } },
        });
        if (decremented.count === 0) {
          throw new OutOfStockError(variant.product.name, variant.size);
        }

        const unitPrice = effectivePrice(variant.product);
        subtotal += unitPrice * qty;
        orderItemsData.push({
          productId: variant.productId,
          variantId: variant.id,
          productName: variant.product.name,
          size: variant.size,
          unitPrice,
          qty,
        });
      }

      const shippingFee = subtotal >= freeShippingThreshold ? 0 : shippingFeeSetting;
      const total = subtotal + shippingFee;
      const orderNumber = await generateOrderNumber();

      return tx.order.create({
        data: {
          orderNumber,
          customerName: input.customerName,
          phone: input.phone,
          city: input.city,
          address: input.address,
          paymentMethod: input.paymentMethod,
          notes: input.notes,
          subtotal,
          shippingFee,
          total,
          customerId: customer?.sub,
          items: { create: orderItemsData },
          statusLogs: { create: { status: "PENDING" } },
        },
      });
    });

    return NextResponse.json(
      {
        orderNumber: order.orderNumber,
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        total: order.total,
        paymentMethod: order.paymentMethod,
        bankDetails: order.paymentMethod === "BANK_TRANSFER" ? bankDetails : null,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof OutOfStockError) {
      return jsonError(err.message, 409);
    }
    throw err;
  }
}
