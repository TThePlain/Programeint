import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(10, "A senha deve ter pelo menos 10 caracteres.")
  .max(200, "A senha é demasiado longa.")
  .regex(/[a-zA-Z]/, "A senha deve conter pelo menos uma letra.")
  .regex(/[0-9]/, "A senha deve conter pelo menos um número.");

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Indica o teu nome.")
    .max(80, "O nome deve ter no máximo 80 caracteres."),
  email: z
    .string()
    .trim()
    .max(254)
    .email("Indica um e-mail válido.")
    .transform((value) => value.toLowerCase()),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254)
    .email("Indica um e-mail válido.")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Indica a senha."),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(20).max(200),
});

export const resendVerificationSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254)
    .email("Indica um e-mail válido.")
    .transform((value) => value.toLowerCase()),
});

export const forgotPasswordSchema = resendVerificationSchema;

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
