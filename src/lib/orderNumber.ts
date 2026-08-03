import { prisma } from "@/lib/prisma";

const CHARS = "0123456789";

function randomDigits(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += CHARS[Math.floor(Math.random() * CHARS.length)];
  return out;
}

/** Generates a unique "TF-XXXXXX" order number, retrying on the rare collision. */
export async function generateOrderNumber(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `TF-${randomDigits(6)}`;
    const existing = await prisma.order.findUnique({ where: { orderNumber: candidate } });
    if (!existing) return candidate;
  }
  throw new Error("Could not generate a unique order number");
}
