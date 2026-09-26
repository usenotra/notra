// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

import {
  OFFERING_CHECK_DESCRIPTION_MAX_LENGTH,
  OFFERING_CHECK_FEATURE_MAX_LENGTH,
  OFFERING_CHECK_FEATURE_MIN_LENGTH,
  OFFERING_CHECK_MAX_OTHER_OFFERINGS,
} from "@/constants/offering-check";
import { normalizeDomain } from "@/utils/offering-check";

const DOMAIN_INPUT_MAX_LENGTH = 200;
const SUMMARY_MAX_LENGTH = 400;
const OTHER_OFFERING_MAX_LENGTH = 80;
const COMPANY_NAME_MAX_LENGTH = 60;
const COMPANY_DESCRIPTION_MAX_LENGTH = 320;

const domainSchema = z
  .string()
  .trim()
  .min(1, "Enter your website.")
  .max(DOMAIN_INPUT_MAX_LENGTH, "That does not look like a website.")
  .transform((value, context) => {
    const domain = normalizeDomain(value);
    if (!domain) {
      context.addIssue({
        code: "custom",
        message: "That does not look like a website.",
      });
      return z.NEVER;
    }
    return domain;
  });

export const offeringCheckRequestSchema = z
  .strictObject({
    domain: domainSchema,
    feature: z
      .string()
      .trim()
      .max(OFFERING_CHECK_FEATURE_MAX_LENGTH, "Keep the feature name short.")
      .refine(
        (value) =>
          value.length === 0 ||
          value.length >= OFFERING_CHECK_FEATURE_MIN_LENGTH,
        "Enter a feature name."
      )
      .default(""),
    description: z
      .string()
      .trim()
      .max(OFFERING_CHECK_DESCRIPTION_MAX_LENGTH, "Keep the description short.")
      .default(""),
  })
  .transform((input) => ({
    ...input,
    description: input.feature.length > 0 ? input.description : "",
  }));

const verdictSchema = z.enum(["knows", "vague", "confused", "unknown"]);

export const offeringJudgementSchema = z.object({
  companyName: z.string().max(COMPANY_NAME_MAX_LENGTH),
  companyDescription: z.string().max(COMPANY_DESCRIPTION_MAX_LENGTH),
  memoryVerdict: verdictSchema,
  memorySummary: z.string().max(SUMMARY_MAX_LENGTH),
  searchVerdict: verdictSchema,
  searchSummary: z.string().max(SUMMARY_MAX_LENGTH),
  otherOfferings: z
    .array(z.string().max(OTHER_OFFERING_MAX_LENGTH))
    .max(OFFERING_CHECK_MAX_OTHER_OFFERINGS),
});

const modeResultSchema = z.object({
  verdict: verdictSchema,
  summary: z.string(),
  answer: z.string(),
  reasoning: z.string(),
  seconds: z.number(),
});

export const offeringCheckResultSchema = z.object({
  domain: z.string(),
  feature: z.string(),
  companyName: z.string(),
  companyDescription: z.string(),
  model: z.string(),
  overall: z.enum(["known", "search-only", "vague", "confused", "unknown"]),
  memory: modeResultSchema,
  search: modeResultSchema,
  otherOfferings: z.array(z.string()),
  queries: z.array(z.string()),
  searchUsed: z.boolean(),
  sources: z.array(
    z.object({
      domain: z.string(),
      pages: z.number(),
      urls: z.array(z.object({ url: z.string(), cited: z.boolean() })),
      cited: z.boolean(),
      own: z.boolean(),
      topUrl: z.string(),
    })
  ),
  checkedAt: z.string(),
});

const modeSchema = z.enum(["memory", "search"]);

export const offeringStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("delta"), mode: modeSchema, text: z.string() }),
  z.object({
    type: z.literal("reasoning"),
    mode: modeSchema,
    text: z.string(),
  }),
  z.object({
    type: z.literal("search"),
    queries: z.array(z.string()),
    domains: z.array(z.string()),
  }),
  z.object({
    type: z.literal("answered"),
    mode: modeSchema,
    seconds: z.number(),
  }),
  z.object({ type: z.literal("result"), result: offeringCheckResultSchema }),
  z.object({ type: z.literal("error") }),
]);
