import { onboardingSuggestionDataSchema } from "@notra/schemas/dashboard/onboarding-agent";

export function getOnboardingSuggestionEvidence(data: unknown): string | null {
  const result = onboardingSuggestionDataSchema.safeParse(data);
  return result.success ? (result.data.evidence ?? null) : null;
}
