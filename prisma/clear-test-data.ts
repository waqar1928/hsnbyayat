import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { createMariaDbAdapter } from "../src/lib/dbAdapter";

// Removes everything prisma/seed-test-data.ts creates, identified by the
// "[TEST]" prefix / TEST- order number / 0300000000x test phone numbers.
// LOCAL DEVELOPMENT ONLY — same production guard as seed-test-data.ts.

const PROD_HOSTS = ["hsnbyayat.com", "157.173.216.65"];

function assertNotProduction() {
  const url = process.env.DATABASE_URL || "";
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    // fall through
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

  const reviews = await prisma.productReview.deleteMany({ where: { title: { startsWith: "[TEST]" } } });
  console.log(`Deleted ${reviews.count} test review(s).`);

  const order = await prisma.order.findFirst({ where: { orderNumber: "TEST-0001" } });
  if (order) {
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
    await prisma.order.delete({ where: { id: order.id } });
    console.log("Deleted test order TEST-0001.");
  }

  const customers = await prisma.customer.deleteMany({ where: { phone: { in: ["03000000001", "03000000002"] } } });
  console.log(`Deleted ${customers.count} test customer(s).`);

  const banners = await prisma.banner.deleteMany({ where: { heading: { startsWith: "[TEST]" } } });
  console.log(`Deleted ${banners.count} test banner(s).`);

  const guides = await prisma.sizeGuide.findMany({ where: { name: { startsWith: "[TEST]" } } });
  for (const guide of guides) {
    await prisma.product.updateMany({ where: { sizeGuideId: guide.id }, data: { sizeGuideId: null } });
    await prisma.sizeGuideEntry.deleteMany({ where: { sizeGuideId: guide.id } });
    await prisma.sizeGuide.delete({ where: { id: guide.id } });
  }
  console.log(`Deleted ${guides.length} test size guide(s).`);

  console.log("\nAll test data removed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
