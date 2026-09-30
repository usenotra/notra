import { DEMO_REQUEST_SOURCES } from "@notra/db/constants/demo";
import { z } from "zod";

import {
  DEMO_ANONYMOUS_ID_PATTERN,
  DEMO_PERSONALIZATION_COMPANY_MAX,
  DEMO_PERSONALIZATION_NAME_MAX,
} from "@/constants/demo";

export const demoSessionPayloadSchema = z.object({
  anonymousId: z.string().regex(DEMO_ANONYMOUS_ID_PATTERN),
});

export const demoSandboxCreateInputSchema = z.object({
  timeZone: z.string().max(64).nullish(),
});

export const demoRequestEventSchema = z.object({
  id: z.string(),
  source: z.enum(DEMO_REQUEST_SOURCES),
  method: z.string(),
  path: z.string(),
  status: z.number(),
  durationMs: z.number(),
  createdAt: z.string(),
  affected: z.array(
    z.object({ type: z.string(), id: z.string(), label: z.string().optional() })
  ),
});

export const demoSlugResponseSchema = z.object({ slug: z.string().min(1) });

export const demoPersonalizationSchema = z.object({
  firstName: z.string().trim().min(1).max(DEMO_PERSONALIZATION_NAME_MAX),
  lastName: z.string().trim().max(DEMO_PERSONALIZATION_NAME_MAX),
  companyName: z.string().trim().min(1).max(DEMO_PERSONALIZATION_COMPANY_MAX),
});
