// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

import {
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_MESSAGE_MIN_LENGTH,
} from "@/constants/contact";

const COMPANY_MAX_LENGTH = 120;

export const contactMessageSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(80, "That name is a little too long."),
  email: z.email("Enter a valid email address."),
  company: z
    .string()
    .trim()
    .max(COMPANY_MAX_LENGTH, "That company name is a little too long.")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  message: z
    .string()
    .trim()
    .min(
      CONTACT_MESSAGE_MIN_LENGTH,
      `Please include at least ${CONTACT_MESSAGE_MIN_LENGTH} characters.`
    )
    .max(
      CONTACT_MESSAGE_MAX_LENGTH,
      `Please keep this under ${CONTACT_MESSAGE_MAX_LENGTH} characters.`
    ),
});
