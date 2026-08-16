import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { createMariaDbAdapter } from "../src/lib/dbAdapter";
import { hashPassword } from "../src/lib/auth";

// LOCAL DEVELOPMENT ONLY. Seeds a small amount of clearly-marked test data
// (every row's name/title is prefixed "[TEST]") so the reviews / size
// guide / banner features can be exercised end-to-end without inventing
// data that looks like real customer activity. Never run this against
// production — the safety check below refuses to run anywhere its
// DATABASE_URL host looks like the production host.
//
// Companion cleanup: `npx tsx prisma/clear-test-data.ts` removes everything
// this script creates (matched by the "[TEST]" prefix), leaving the rest
// of the seeded catalog untouched.

const PROD_HOSTS = ["hsnbyayat.com", "157.173.216.65"];

function assertNotProduction() {
  const url = process.env.DATABASE_URL || "";
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    // fall through — an unparsable URL isn't production either, just broken
  }
  if (PROD_HOSTS.includes(host)) {
    console.error(`Refusing to run: DATABASE_URL host "${host}" looks like production. This script is local-dev only.`);
    process.exit(1);
  }
  console.log(`Safety check passed — DATABASE_URL host is "${host}" (not production). Proceeding.`);
}

const adapter = createMariaDbAdapter();
const prisma = new PrismaClient({ adapter });

async function main() {
  assertNotProduction();

  const product = await prisma.product.findFirst({
    where: { isActive: true },
    include: { variants: true },
    orderBy: { createdAt: "asc" },
  });
  if (!product || product.variants.length === 0) {
    console.error("No seeded product with variants found — run `npm run db:seed` first.");
    process.exit(1);
  }
  console.log(`Using existing product for test data: ${product.name} (${product.id})`);

  // --- Size guide, attached directly to this one product ---
  const existingGuide = await prisma.sizeGuide.findFirst({ where: { name: "[TEST] Tee Size Chart" } });
  const sizeGuide =
    existingGuide ||
    (await prisma.sizeGuide.create({
      data: {
        name: "[TEST] Tee Size Chart",
        description: "Local test data — safe to delete via prisma/clear-test-data.ts.",
        columns: JSON.stringify(["Chest (in)", "Length (in)"]),
        entries: {
          create: [
            { size: "S", sortOrder: 0, values: JSON.stringify({ "Chest (in)": "38", "Length (in)": "26" }) },
            { size: "M", sortOrder: 1, values: JSON.stringify({ "Chest (in)": "40", "Length (in)": "27" }) },
            { size: "L", sortOrder: 2, values: JSON.stringify({ "Chest (in)": "42", "Length (in)": "28" }) },
            { size: "XL", sortOrder: 3, values: JSON.stringify({ "Chest (in)": "44", "Length (in)": "29" }) },
          ],
        },
      },
    }));
  await prisma.product.update({ where: { id: product.id }, data: { sizeGuideId: sizeGuide.id } });
  console.log(`Size guide "${sizeGuide.name}" attached to ${product.name}.`);

  // --- Two test customers: one with a qualifying purchase, one without ---
  const passwordHash = await hashPassword("test1234");

  const verifiedCustomer = await prisma.customer.upsert({
    where: { phone: "03000000001" },
    create: { name: "[TEST] Verified Customer", phone: "03000000001", passwordHash },
    update: {},
  });
  const unverifiedCustomer = await prisma.customer.upsert({
    where: { phone: "03000000002" },
    create: { name: "[TEST] Unverified Customer", phone: "03000000002", passwordHash },
    update: {},
  });

  // --- A DELIVERED order for the verified customer, containing this product ---
  const existingOrder = await prisma.order.findFirst({ where: { orderNumber: "TEST-0001" } });
  if (!existingOrder) {
    const variant = product.variants[0];
    await prisma.order.create({
      data: {
        orderNumber: "TEST-0001",
        customerId: verifiedCustomer.id,
        customerName: verifiedCustomer.name,
        phone: verifiedCustomer.phone,
        city: "Lahore",
        address: "[TEST] 123 Test Street, Lahore",
        paymentMethod: "COD",
        status: "DELIVERED",
        subtotal: product.price,
        shippingFee: 0,
        total: product.price,
        items: {
          create: [
            {
              productId: product.id,
              variantId: variant.id,
              productName: product.name,
              size: variant.size,
              unitPrice: product.price,
              qty: 1,
            },
          ],
        },
      },
    });
    console.log(`Test order TEST-0001 created for ${verifiedCustomer.name} (DELIVERED, qualifies as verified purchase).`);
  }

  // --- Reviews: one approved+verified, one pending+unverified, so both moderation states are visible ---
  await prisma.productReview.upsert({
    where: { productId_customerId: { productId: product.id, customerId: verifiedCustomer.id } },
    create: {
      productId: product.id,
      customerId: verifiedCustomer.id,
      rating: 5,
      title: "[TEST] Great everyday fit",
      body: "[TEST] This is local development test data, not a real customer review. Safe to delete.",
      status: "APPROVED",
      isVerifiedPurchase: true,
    },
    update: {},
  });
  await prisma.productReview.upsert({
    where: { productId_customerId: { productId: product.id, customerId: unverifiedCustomer.id } },
    create: {
      productId: product.id,
      customerId: unverifiedCustomer.id,
      rating: 3,
      title: "[TEST] Awaiting moderation",
      body: "[TEST] This is local development test data, not a real customer review. Left PENDING on purpose to test the moderation queue.",
      status: "PENDING",
      isVerifiedPurchase: false,
    },
    update: {},
  });
  console.log("Test reviews created (1 approved+verified, 1 pending+unverified).");

  // --- Banner, reusing an existing product image so no new file upload is needed ---
  const anyImage = await prisma.productImage.findFirst();
  const existingBanner = await prisma.banner.findFirst({ where: { heading: "[TEST] Summer Banner" } });
  if (!existingBanner && anyImage) {
    await prisma.banner.create({
      data: {
        heading: "[TEST] Summer Banner",
        description: "[TEST] Local development test data — safe to delete.",
        ctaText: "Shop now",
        ctaUrl: "/shop",
        desktopImageUrl: anyImage.url,
        isActive: true,
        sortOrder: 0,
      },
    });
    console.log("Test banner created.");
  } else if (!anyImage) {
    console.warn("No product images found — skipped creating a test banner (nothing to reuse as its image).");
  }

  console.log("\nDone. Log in on the storefront as:");
  console.log("  Verified customer — phone 03000000001, password test1234");
  console.log("  Unverified customer — phone 03000000002, password test1234");
  console.log(`Visit /products/${product.slug} to see the size guide, rating, and reviews.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
