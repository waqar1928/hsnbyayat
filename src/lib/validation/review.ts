import { z } from "zod";

// A customer submits/updates their own review for a product — see
// src/app/api/reviews/route.ts. status/isVerifiedPurchase are never
// client-settable (computed server-side), which is why they're absent here.
export const submitReviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional().nullable(),
  body: z.string().min(10, "Tell us a bit more — at least 10 characters.").max(4000),
});

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;

export const reviewModerationSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

export type ReviewModerationInput = z.infer<typeof reviewModerationSchema>;
