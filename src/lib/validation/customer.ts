import { z } from "zod";

export const customerRegisterSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .regex(/[0-9]{9,}/, "Enter a valid phone number")
    .transform((v) => v.replace(/[^0-9+]/g, "")),
  email: z.string().trim().toLowerCase().email().optional(),
  password: z.string().min(8).max(100),
});

export const customerLoginSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/[0-9]{9,}/, "Enter a valid phone number")
    .transform((v) => v.replace(/[^0-9+]/g, "")),
  password: z.string().min(1),
});
