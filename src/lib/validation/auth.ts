import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const newsletterSubscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const inviteAdminSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(2).max(100),
  password: z.string().min(8).max(100),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

// Used when one logged-in admin sets another admin's password directly
// (Admin users page) — deliberately no currentPassword field, unlike
// changePasswordSchema: the acting admin's own session is the
// authorization, not the target account's current password (which they
// wouldn't know). Only ever used on *other* admins, never your own
// account — see the self-reset guard in the route handler.
export const adminResetPasswordSchema = z.object({
  newPassword: z.string().min(8).max(100),
});
