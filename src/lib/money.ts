// All prices are integer PKR — never floating point.

export function formatPKR(amount: number): string {
  return "Rs. " + amount.toLocaleString("en-PK");
}

export function effectivePrice(p: { price: number; salePrice?: number | null; salePct?: number | null }): number {
  return p.salePct && p.salePrice ? p.salePrice : p.price;
}

/** Given a base price and a sale percentage, compute the integer sale price (rounded down to nearest rupee). */
export function priceFromPct(price: number, salePct: number): number {
  return Math.round(price * (1 - salePct / 100));
}

/** Given a base price and a discounted price, compute the integer sale percentage. */
export function pctFromPrice(price: number, salePrice: number): number {
  return Math.round(((price - salePrice) / price) * 100);
}
