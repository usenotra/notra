// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

import {
  OFFERING_CHECK_PROBLEM_MAX_LENGTH,
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
    problem: z
      .string()
      .trim()
      .max(OFFERING_CHECK_PROBLEM_MAX_LENGTH, "Keep the problem short.")
      .default(""),
  })
  .transform((input) => ({
    ...input,
    problem: input.feature.length > 0 ? input.problem : "",
  }));

const verdictSchema = z.enum(["knows", "vague", "confused", "unknown"]);

const gradeSchema = z.object({
  verdict: verdictSchema,
  summary: z.string().max(SUMMARY_MAX_LENGTH),
});

export const offeringJudgeSchema = z.object({
  companyName: z.string().max(COMPANY_NAME_MAX_LENGTH),
  companyDescription: z.string().max(COMPANY_DESCRIPTION_MAX_LENGTH),
  otherOfferings: z
    .array(z.string().max(OTHER_OFFERING_MAX_LENGTH))
    .max(OFFERING_CHECK_MAX_OTHER_OFFERINGS),
  name: gradeSchema,
  problem: gradeSchema.nullable(),
});

const questionKindSchema = z.enum(["name", "problem"]);

const answerSchema = z.object({
  kind: questionKindSchema,
  question: z.string(),
  verdict: verdictSchema,
  summary: z.string(),
  answer: z.string(),
  reasoning: z.string(),
  seconds: z.number(),
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
});

export const offeringCheckResultSchema = z.object({
  domain: z.string(),
  feature: z.string(),
  problem: z.string(),
  companyName: z.string(),
  companyDescription: z.string(),
  model: z.string(),
  otherOfferings: z.array(z.string()),
  answers: z.array(answerSchema).min(1),
  checkedAt: z.string(),
});

export const offeringStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("delta"),
    kind: questionKindSchema,
    text: z.string(),
  }),
  z.object({
    type: z.literal("reasoning"),
    kind: questionKindSchema,
    text: z.string(),
  }),
  z.object({
    type: z.literal("search"),
    kind: questionKindSchema,
    queries: z.array(z.string()),
    domains: z.array(z.string()),
  }),
  z.object({
    type: z.literal("answered"),
    kind: questionKindSchema,
    seconds: z.number(),
  }),
  z.object({ type: z.literal("result"), result: offeringCheckResultSchema }),
  z.object({ type: z.literal("error") }),
]);

export const offeringReportSearchSchema = z.object({
  domain: z.string().optional().catch(undefined),
  feature: z.string().optional().catch(undefined),
  problem: z.string().optional().catch(undefined),
});
