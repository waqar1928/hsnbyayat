import { z } from "zod";

export const cartItemInputSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  qty: z.number().int().min(1).max(20),
});

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .regex(/[0-9]{9,}/, "Enter a valid phone number")
    .transform((v) => v.replace(/[^0-9+]/g, "")),
  city: z.string().trim().min(2).max(60),
  address: z.string().trim().min(8).max(500),
  paymentMethod: z.enum(["COD", "BANK_TRANSFER"]),
  notes: z.string().trim().max(500).optional(),
  items: z.array(cartItemInputSchema).min(1).max(30),
});

export const trackOrderSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^TF-[A-Z0-9]{6}$/, "Enter a valid order number, e.g. TF-123456"),
  phone: z
    .string()
    .trim()
    .regex(/[0-9]{9,}/, "Enter a valid phone number")
    .transform((v) => v.replace(/[^0-9+]/g, "")),
});

export const orderStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
]);

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
  courierName: z.string().trim().max(80).optional(),
  trackingCode: z.string().trim().max(80).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type TrackOrderInput = z.infer<typeof trackOrderSchema>;
