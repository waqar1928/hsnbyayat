import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric, and hyphen-separated")
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateCategorySchema = createCategorySchema.extend({
  isActive: z.boolean().optional(),
});

export const createSubcategorySchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric, and hyphen-separated")
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateSubcategorySchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric, and hyphen-separated")
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  categoryId: z.string().min(1).optional(),
});
