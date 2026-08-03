import { z } from "zod";

export const badgeSchema = z.enum(["New", "BestSeller"]).nullable();

export const variantInputSchema = z.object({
  id: z.string().optional(), // present when updating an existing variant
  size: z.string().min(1).max(30),
  sku: z.string().min(1).max(60),
  stockQty: z.number().int().min(0),
});

export const productImageInputSchema = z.object({
  id: z.string().optional(),
  url: z.string().min(1),
  altText: z.string().max(200).optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
});

export const createProductSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric, and hyphen-separated"),
  description: z.string().min(1).max(4000),
  categoryId: z.string().min(1, "Choose a category"),
  subcategoryId: z.string().min(1, "Choose a subcategory"),
  price: z.number().int().positive(),
  // Admin enters the discounted price directly; salePct is derived server-side
  // (see money.ts#pctFromPrice) so the two never drift out of sync.
  salePrice: z.number().int().positive().nullable().optional(),
  badge: badgeSchema.optional(),
  isBestSeller: z.boolean().default(false),
  isActive: z.boolean().default(true),
  variants: z.array(variantInputSchema).min(1),
  images: z.array(productImageInputSchema).default([]),
});

// Edits are full-object replaces from the admin edit form (not JSON PATCH
// semantics), so we reuse createProductSchema for PUT rather than partial().
export const updateProductSchema = createProductSchema;

export const productToggleSchema = z.object({
  isActive: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
