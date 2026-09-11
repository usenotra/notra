import "zod/compile";
import { Schema } from "effect";
import { z } from "zod";

export class OnboardingAgentTriggerError extends Schema.TaggedError<OnboardingAgentTriggerError>()(
  "OnboardingAgentTriggerError",
  {
    cause: Schema.Defect(),
    organizationId: Schema.String,
  }
) {}

export class OnboardingAgentCompensationError extends Schema.TaggedError<OnboardingAgentCompensationError>()(
  "OnboardingAgentCompensationError",
  {
    cause: Schema.Defect(),
    organizationId: Schema.String,
    triggerCause: Schema.Defect(),
  }
) {}

export const triggerOnboardingAgentSetupSchema = z.object({
  organizationId: z.string().trim().min(1),
  websiteUrl: z.string().trim().min(1).optional(),
});

export const listSuggestionsInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  includeDismissed: z.boolean().optional(),
});

export const dismissSuggestionInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  suggestionId: z.string().min(1),
});

export const onboardingSuggestionDataSchema = z.looseObject({
  evidence: z.string().trim().min(1).optional(),
});

export const eveCreateSessionResponseSchema = z.object({
  ok: z.literal(true),
  sessionId: z.string().min(1),
});
