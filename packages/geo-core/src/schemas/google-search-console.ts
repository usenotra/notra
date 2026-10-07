import { array, object, string } from "zod";

import {
  GSC_MAX_KEYWORDS_PER_SUGGESTION,
  GSC_SUGGESTIONS_MAX_PER_SYNC,
} from "../constants/google-search-console";

const MAX_CALLBACK_PATH_LENGTH = 512;

export const gscAuthorizeQuerySchema = object({
  organizationId: string().min(1, "Organization ID is required"),
  callbackPath: string()
    .min(1)
    .max(MAX_CALLBACK_PATH_LENGTH)
    .refine((path) => path.startsWith("/") && !path.startsWith("//"), {
      message: "callbackPath must be a same-origin path",
    })
    .default("/"),
});

export const gscSelectSiteInputSchema = object({
  organizationId: string().min(1),
  projectId: string().min(1).optional(),
  siteUrl: string().min(1),
});

export const gscSyncPayloadSchema = object({
  organizationId: string().min(1),
});

/**
 * Deliberately permissive: a single over-long prompt or one extra item must not
 * fail the whole generation. runSync re-checks length per prompt and drops what
 * does not fit.
 */
export const geoSearchConsoleSuggestionSchema = object({
  prompts: array(
    object({
      prompt: string().min(1),
      title: string().min(1),
      keywords: array(string().min(1)).transform((keywords) =>
        keywords.slice(0, GSC_MAX_KEYWORDS_PER_SUGGESTION)
      ),
    })
  ).transform((prompts) => prompts.slice(0, GSC_SUGGESTIONS_MAX_PER_SYNC)),
});
