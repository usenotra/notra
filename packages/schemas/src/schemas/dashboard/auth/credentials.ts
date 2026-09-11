import "zod/compile";
import { returnToSchema } from "@notra/schemas/dashboard/auth/return-to";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

export const signupSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(10, "Password must be at least 10 characters")
    .max(128, "Password must be at most 128 characters"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password must be at most 128 characters"),
});

const verificationCodeSchema = z
  .string()
  .regex(/^\d{6}$/, "Enter the 6-digit code from your email");

const AUTH_NAME_MAX_LENGTH = 100;
const AUTH_TOKEN_MAX_LENGTH = 4096;
const RESET_PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

export const signInWithPasswordInputSchema = loginSchema.extend({
  returnTo: returnToSchema,
});

export const signUpWithPasswordInputSchema = signupSchema.extend({
  name: z
    .string()
    .trim()
    .max(AUTH_NAME_MAX_LENGTH, "Name must be at most 100 characters")
    .optional(),
  returnTo: returnToSchema,
});

export const verifyEmailCodeInputSchema = z.object({
  pendingAuthenticationToken: z
    .string()
    .min(1, "Verification session is missing")
    .max(AUTH_TOKEN_MAX_LENGTH),
  code: verificationCodeSchema,
  returnTo: returnToSchema,
});

export const forgotPasswordInputSchema = z.object({
  email: loginSchema.shape.email,
});

export const resetPasswordInputSchema = z.object({
  token: z.string().min(1, "Reset token is missing").max(AUTH_TOKEN_MAX_LENGTH),
  newPassword: z
    .string()
    .min(RESET_PASSWORD_MIN_LENGTH, "Password must be at least 8 characters")
    .max(PASSWORD_MAX_LENGTH, "Password must be at most 128 characters"),
});
