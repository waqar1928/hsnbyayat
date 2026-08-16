import { z } from "zod";

export const bannerSchema = z.object({
  heading: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  ctaText: z.string().max(40).optional().nullable(),
  ctaUrl: z.string().max(300).optional().nullable(),
  desktopImageUrl: z.string().min(1, "Upload a desktop banner image"),
  mobileImageUrl: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  // Sent as ISO strings from the admin form's <input type="datetime-local">.
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
});

export type BannerInput = z.infer<typeof bannerSchema>;
