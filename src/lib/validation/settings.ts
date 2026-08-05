import { z } from "zod";

export const heroSlideSchema = z.object({
  eyebrow: z.string().max(120),
  heading: z.string().max(200),
  text: z.string().max(400),
  cta: z.string().max(60),
  filter: z.object({
    group: z.string().optional(),
    sub: z.string().optional(),
    salePct: z.number().optional(),
    badge: z.string().optional(),
  }),
  tagLines: z.array(z.string().max(60)),
});

export const bankDetailsSchema = z.object({
  bankName: z.string().max(80),
  accountTitle: z.string().max(120),
  accountNumber: z.string().max(60),
  iban: z.string().max(60),
  branch: z.string().max(120),
});

export const infoPageSchema = z.object({ title: z.string().max(80), body: z.string().max(8000) });
export const infoPagesSchema = z.object({
  shipping: infoPageSchema,
  returns: infoPageSchema,
  faq: infoPageSchema,
  contact: infoPageSchema,
  // terms/privacy bodies run considerably longer than the others (full
  // policy text) — bumped the shared infoPageSchema's body limit above to
  // 8000 to give them room rather than giving these two their own schema.
  terms: infoPageSchema,
  privacy: infoPageSchema,
});

export const brandSettingsSchema = z.object({
  name: z.string().max(60),
  city: z.string().max(120),
  email: z.string().email(),
  phone: z.string().max(40),
  instagram: z.string().max(200).optional().default(""),
  facebook: z.string().max(200).optional().default(""),
  tiktok: z.string().max(200).optional().default(""),
  logoUrl: z.string().max(500).nullable().optional().default(null),
});

export const analyticsSettingsSchema = z.object({
  // Meta pixel IDs are numeric strings, typically 15-16 digits — validated
  // loosely (digits only) rather than an exact length, since Meta hasn't
  // publicly committed to a fixed length.
  facebookPixelId: z
    .string()
    .max(40)
    .regex(/^\d*$/, "Pixel ID should contain only digits")
    .optional()
    .default(""),
});

export const updateSettingsSchema = z.object({
  announcements: z.array(z.string().max(200)).optional(),
  heroSlides: z.array(heroSlideSchema).optional(),
  shippingFee: z.number().int().min(0).optional(),
  freeShippingThreshold: z.number().int().min(0).optional(),
  bankDetails: bankDetailsSchema.optional(),
  whatsappNumber: z.string().max(40).optional(),
  infoPages: infoPagesSchema.optional(),
  marqueeText: z.string().max(400).optional(),
  brand: brandSettingsSchema.optional(),
  analytics: analyticsSettingsSchema.optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
