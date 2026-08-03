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
