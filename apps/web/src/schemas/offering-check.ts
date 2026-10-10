// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import { parseAsBoolean, parseAsString } from "nuqs";
import * as z from "zod";

import {
  OFFERING_CHECK_FEATURE_MAX_LENGTH,
  OFFERING_CHECK_FEATURE_MAX_WORDS,
  OFFERING_CHECK_FEATURE_MIN_LENGTH,
  OFFERING_CHECK_MAX_OTHER_OFFERINGS,
  OFFERING_CHECK_PROBLEM_MAX_LENGTH,
  OFFERING_CHECK_PROBLEM_MIN_LENGTH,
  OFFERING_COMPANY_DESCRIPTION_MAX_LENGTH,
  OFFERING_COMPANY_NAME_MAX_LENGTH,
  OFFERING_CONTROL_CHARACTER_PATTERN,
  OFFERING_DOMAIN_INPUT_MAX_LENGTH,
  OFFERING_LINK_PATTERN,
  OFFERING_OTHER_OFFERING_MAX_LENGTH,
  OFFERING_SUMMARY_MAX_LENGTH,
  OFFERING_WHITESPACE_RUN,
} from "@/constants/offering-check";
import { normalizeDomain } from "@/utils/offering-domain";

const domainSchema = z
  .string()
  .trim()
  .min(1, "Enter your website.")
  .max(OFFERING_DOMAIN_INPUT_MAX_LENGTH, "That does not look like a website.")
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
          !(
            OFFERING_CONTROL_CHARACTER_PATTERN.test(value) ||
            OFFERING_LINK_PATTERN.test(value)
          ),
        "Use plain text for the feature name."
      )
      .refine(
        (value) =>
          value.length === 0 ||
          value.length >= OFFERING_CHECK_FEATURE_MIN_LENGTH,
        "Enter a feature name."
      )
      .refine(
        (value) =>
          value.split(OFFERING_WHITESPACE_RUN).length <=
          OFFERING_CHECK_FEATURE_MAX_WORDS,
        "Name the feature in a few words."
      )
      .default(""),
    problem: z
      .string()
      .transform((value) => value.replace(OFFERING_WHITESPACE_RUN, " ").trim())
      .pipe(
        z
          .string()
          .max(OFFERING_CHECK_PROBLEM_MAX_LENGTH, "Keep the problem short.")
          .refine(
            (value) =>
              value.length === 0 ||
              value.length >= OFFERING_CHECK_PROBLEM_MIN_LENGTH,
            "Describe the problem in a sentence."
          )
          .refine(
            (value) =>
              !(
                OFFERING_CONTROL_CHARACTER_PATTERN.test(value) ||
                OFFERING_LINK_PATTERN.test(value)
              ),
            "Use plain text for the problem, without links."
          )
      )
      .default(""),
    webSearch: z.boolean().default(false),
  })
  .transform((input) => ({
    ...input,
    problem: input.feature.length > 0 ? input.problem : "",
  }));

const verdictSchema = z.enum(["knows", "vague", "confused", "unknown"]);

const gradeSchema = z.object({
  verdict: verdictSchema,
  summary: z.string().max(OFFERING_SUMMARY_MAX_LENGTH),
});

export const offeringJudgeSchema = z.object({
  companyName: z.string().max(OFFERING_COMPANY_NAME_MAX_LENGTH),
  companyDescription: z.string().max(OFFERING_COMPANY_DESCRIPTION_MAX_LENGTH),
  otherOfferings: z
    .array(z.string().max(OFFERING_OTHER_OFFERING_MAX_LENGTH))
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

// The router parses `?feature=42` or `?feature=true` as JSON, so values come
// back as numbers, booleans or arrays. They are all plain text here.
const searchTextSchema = z.preprocess(
  (value) =>
    value === undefined || typeof value === "string"
      ? value
      : JSON.stringify(value),
  z.string().optional().catch(undefined)
);

export const offeringReportSearchSchema = z.object({
  domain: searchTextSchema,
  feature: searchTextSchema,
  problem: searchTextSchema,
  webSearch: z.boolean().optional().catch(undefined),
});

// The form lives in the URL, so going back from a report keeps the input and
// links like /offering?domain=acme.com prefill it.
export const offeringFormParsers = {
  domain: parseAsString.withDefault(""),
  feature: parseAsString.withDefault(""),
  problem: parseAsString.withDefault(""),
  webSearch: parseAsBoolean.withDefault(false),
};
