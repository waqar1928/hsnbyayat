import { prisma } from "@/lib/prisma";

// Typed wrapper around the Setting key/value store. Structured values are
// stored as JSON strings; lib/settings.ts is the only place that parses them.

export const SETTING_KEYS = {
  ANNOUNCEMENTS: "announcements",
  HERO_SLIDES: "heroSlides",
  SHIPPING_FEE: "shippingFee",
  FREE_SHIPPING_THRESHOLD: "freeShippingThreshold",
  BANK_DETAILS: "bankDetails",
  WHATSAPP_NUMBER: "whatsappNumber",
  INFO_PAGES: "infoPages",
  MARQUEE_TEXT: "marqueeText",
  BRAND: "brand",
  ANALYTICS: "analytics",
} as const;

export type HeroSlide = {
  eyebrow: string;
  heading: string; // may contain <em>…</em> for the indigo-highlighted word, matching the original design
  text: string;
  cta: string;
  filter: { group?: string; sub?: string; salePct?: number; badge?: string };
  tagLines: string[]; // lines for the garment-tag visual, "<hr>" renders a divider
};

export type BankDetails = {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
  branch: string;
};

export type InfoPageContent = { title: string; body: string };
export type InfoPages = {
  shipping: InfoPageContent;
  returns: InfoPageContent;
  faq: InfoPageContent;
  contact: InfoPageContent;
  terms: InfoPageContent;
  privacy: InfoPageContent;
};

export type BrandSettings = {
  name: string;
  city: string;
  email: string;
  phone: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  // Uploaded logo image URL, rendered via <BrandMark>. When set, it replaces
  // the text wordmark (<BrandWordmark>) in the header, admin sidebar, admin
  // login, and printed packing slips. Null falls back to the text wordmark.
  logoUrl: string | null;
};

// Ad-platform pixel IDs — public by design (they're meant to be embedded in
// client-side HTML), so no secrecy concern storing them the same way as
// other admin-editable settings. Empty string means "not configured, don't
// load the script" — see components/FacebookPixel.tsx.
export type AnalyticsSettings = {
  facebookPixelId: string;
};

export const DEFAULT_SETTINGS: Record<string, unknown> = {
  [SETTING_KEYS.ANNOUNCEMENTS]: [
    "Free shipping on nationwide orders over Rs. 5,000",
    "Summer sale — up to 40% off selected pieces",
    "Cash on delivery available across Pakistan",
  ],
  [SETTING_KEYS.HERO_SLIDES]: [
    {
      eyebrow: "Cut & sewn in Lahore — Est. 2026",
      heading: "Clothes built for <em>every single day</em>",
      text: "Heavyweight cotton, honest stitching, no logos shouting at anyone. Essentials designed to be worn, washed, and worn again.",
      cta: "Shop the collection",
      filter: {},
      tagLines: ["100% COTTON", "240 GSM JERSEY", "<hr>", "MACHINE WASH COLD", "DO NOT BLEACH", "<hr>", "MADE IN PAKISTAN"],
    },
    {
      eyebrow: "New in — Summer '26",
      heading: "The <em>new arrivals</em> are here",
      text: "Fresh cuts of the boxy tee, the wide short and the canvas tote. Small batches — when they're gone, they're gone.",
      cta: "Shop new in",
      filter: { badge: "New" },
      tagLines: ["SUMMER '26 DROP", "SMALL BATCH", "<hr>", "BOXY TEE — INDIGO", "WIDE SHORT — STONE", "CANVAS TOTE", "<hr>", "LIMITED RUN"],
    },
    {
      eyebrow: "Limited time",
      heading: "Summer sale — up to <em>40% off</em>",
      text: "Selected fleece, layers and accessories at flat discounts. Sizes are moving fast.",
      cta: "Shop the sale",
      filter: { group: "Sale" },
      tagLines: ["SUMMER SALE", "<hr>", "FLAT 20% OFF", "FLAT 25% OFF", "FLAT 30% OFF", "<hr>", "WHILE STOCKS LAST"],
    },
  ] satisfies HeroSlide[],
  [SETTING_KEYS.SHIPPING_FEE]: 250,
  [SETTING_KEYS.FREE_SHIPPING_THRESHOLD]: 5000,
  [SETTING_KEYS.BANK_DETAILS]: {
    bankName: "Meezan Bank",
    accountTitle: "HSN By Ayat",
    accountNumber: "0123-4567890-1",
    iban: "PK00MEZN0000123456789",
    branch: "Gulberg, Lahore",
  } satisfies BankDetails,
  [SETTING_KEYS.WHATSAPP_NUMBER]: "+92 300 0000000",
  [SETTING_KEYS.INFO_PAGES]: {
    shipping: {
      title: "Shipping",
      body: "Nationwide delivery in 2–4 working days via courier. Flat Rs. 250 shipping — free on orders over Rs. 5,000. Orders placed before 2pm ship the same day.",
    },
    returns: {
      title: "Returns & exchange",
      body: "14-day exchange on unworn items with tags attached. Size swaps are free — message us on WhatsApp with your order number. Sale items are exchange-only.",
    },
    faq: {
      title: "FAQs",
      body: "<b>Do sizes run true?</b> Our fits are boxy — size down if you prefer a closer fit.<br><br><b>Cash on delivery?</b> Yes, nationwide.<br><br><b>Restocks?</b> Small batches restock monthly — subscribe to the newsletter for alerts.",
    },
    contact: {
      title: "Contact us",
      body: "WhatsApp: +92 300 0000000 (11am–8pm)<br>Email: hello@hsnbyayat.pk<br>Based in Lahore, Pakistan.",
    },
    terms: {
      title: "Terms of service",
      body:
        "<b>Orders &amp; pricing.</b> All prices are listed in Pakistani Rupees (PKR) and include applicable taxes. We reserve the right to correct pricing errors and to limit order quantities. Placing an order is an offer to buy, which we may accept or decline (for example if an item goes out of stock before dispatch).<br><br>" +
        "<b>Payment.</b> We currently accept Cash on Delivery and direct bank transfer only — we do not accept card payments and never ask for your card details. Bank transfer orders are dispatched once payment is confirmed.<br><br>" +
        "<b>Shipping &amp; delivery.</b> See our <a href=\"/info/shipping\">Shipping</a> page for delivery times and fees. Risk of loss passes to you on delivery to the address provided at checkout — please double-check your address and phone number before placing an order.<br><br>" +
        "<b>Returns &amp; exchanges.</b> See our <a href=\"/info/returns\">Returns &amp; exchange</a> page.<br><br>" +
        "<b>Cancellations.</b> You may cancel an order any time before it ships by contacting us on WhatsApp with your order number.<br><br>" +
        "<b>Intellectual property.</b> All product photography, text, and branding on this site belong to us and may not be reused without permission.<br><br>" +
        "<b>Liability.</b> We aren't liable for indirect or consequential losses arising from use of this site or delayed/failed delivery caused by circumstances outside our reasonable control (courier delays, incorrect address supplied, etc.).<br><br>" +
        "<b>Governing law.</b> These terms are governed by the laws of Pakistan.<br><br>" +
        "Questions? Reach us via the <a href=\"/info/contact\">Contact us</a> page.",
    },
    privacy: {
      title: "Privacy policy",
      body:
        "<b>What we collect.</b> When you place an order, we collect your name, phone number, delivery address, and (optionally) email — only what's needed to fulfil and ship your order. If you subscribe to our newsletter, we collect your email address for that purpose alone.<br><br>" +
        "<b>Payment data.</b> We do not accept card payments and never collect or store card numbers, CVVs, or any card details — we only offer Cash on Delivery and bank transfer, so there's no payment card data on our systems to protect or lose.<br><br>" +
        "<b>How we use it.</b> Order details are used to process, pack, and ship your order, to contact you about it (by phone/WhatsApp/email), and for our own inventory and sales records. We don't sell your personal information to anyone.<br><br>" +
        "<b>Who we share it with.</b> We share your name, phone number, and address with our courier partner solely to deliver your order — nothing more.<br><br>" +
        "<b>Cookies.</b> We use a small number of strictly-necessary cookies to keep your cart and (if you sign in) your session working — no third-party ad-tracking cookies.<br><br>" +
        "<b>Your rights.</b> You can ask us to see, correct, or delete the personal information we hold about you, and unsubscribe from marketing emails at any time, by messaging us on <a href=\"/info/contact\">WhatsApp or email</a>.<br><br>" +
        "<b>Changes.</b> If we materially change this policy, we'll update this page with a new effective date.<br><br>" +
        "Questions about your data? Reach us via the <a href=\"/info/contact\">Contact us</a> page.",
    },
  } satisfies InfoPages,
  [SETTING_KEYS.MARQUEE_TEXT]:
    "FREE SHIPPING OVER RS. 5,000 ✦ SUMMER SALE UP TO 40% OFF ✦ CASH ON DELIVERY NATIONWIDE ✦ CUT & SEWN IN LAHORE ✦",
  [SETTING_KEYS.BRAND]: {
    name: "HSN BY AYAT",
    city: "Lahore, Pakistan",
    email: "hello@hsnbyayat.pk",
    phone: "+92 300 0000000",
    instagram: "",
    facebook: "",
    tiktok: "",
    logoUrl: null,
  } satisfies BrandSettings,
  [SETTING_KEYS.ANALYTICS]: {
    facebookPixelId: "",
  } satisfies AnalyticsSettings,
};

/** Lowercase, hyphenated brand name — used for export filenames etc. */
export async function getBrandSlug(): Promise<string> {
  const brand = await getSetting<BrandSettings>(SETTING_KEYS.BRAND);
  return brand.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/**
 * Shallow-merges a stored setting with its DEFAULT_SETTINGS shape, so that
 * adding a new key to an object-shaped default (e.g. a new info page, a new
 * brand field) shows up immediately for every already-seeded database
 * without a migration — existing keys the admin has customized always win,
 * this only *fills gaps*. Doesn't apply to arrays or primitives, where
 * "merging" wouldn't mean anything sensible.
 */
function mergeWithDefault(stored: unknown, fallback: unknown): unknown {
  if (isPlainObject(stored) && isPlainObject(fallback)) {
    return { ...fallback, ...stored };
  }
  return stored;
}

export async function getSetting<T = unknown>(key: string): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  const fallback = DEFAULT_SETTINGS[key];
  if (!row) return fallback as T;
  try {
    return mergeWithDefault(JSON.parse(row.value), fallback) as T;
  } catch {
    return row.value as unknown as T;
  }
}

export async function getSettings(keys: string[]): Promise<Record<string, unknown>> {
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const raw = map.get(key);
    const fallback = DEFAULT_SETTINGS[key];
    if (raw === undefined) {
      result[key] = fallback;
    } else {
      try {
        result[key] = mergeWithDefault(JSON.parse(raw), fallback);
      } catch {
        result[key] = raw;
      }
    }
  }
  return result;
}

export async function getAllPublicSettings() {
  return getSettings([
    SETTING_KEYS.ANNOUNCEMENTS,
    SETTING_KEYS.HERO_SLIDES,
    SETTING_KEYS.SHIPPING_FEE,
    SETTING_KEYS.FREE_SHIPPING_THRESHOLD,
    SETTING_KEYS.BANK_DETAILS,
    SETTING_KEYS.WHATSAPP_NUMBER,
    SETTING_KEYS.INFO_PAGES,
    SETTING_KEYS.MARQUEE_TEXT,
    SETTING_KEYS.BRAND,
    SETTING_KEYS.ANALYTICS,
  ]);
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: serialized },
    update: { value: serialized },
  });
}
