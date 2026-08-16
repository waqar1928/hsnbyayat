import { z } from "zod";

// A size guide's columns are business-defined (Chest/Waist/Hip/Length/...
// for tops, completely different fields for footwear) — see the SizeGuide
// model comment in schema.prisma. Kept flexible on purpose, not a fixed enum.
export const sizeGuideEntrySchema = z.object({
  id: z.string().optional(),
  size: z.string().min(1).max(30),
  sortOrder: z.number().int().min(0).default(0),
  // Keyed by the parent SizeGuide's `columns`; values are always displayed
  // as-is (e.g. "34", "34-36 in") so plain strings, not numbers.
  values: z.record(z.string(), z.string().max(60)),
});

export const sizeGuideSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional().nullable(),
  columns: z.array(z.string().min(1).max(40)).min(1, "Add at least one measurement column"),
  entries: z.array(sizeGuideEntrySchema).default([]),
});

export type SizeGuideInput = z.infer<typeof sizeGuideSchema>;
