import {
  GEO_PROMPT_MAX_LENGTH,
  GEO_PROMPT_MIN_LENGTH,
} from "@notra/geo-core/constants/geo";
import { promptKey } from "@notra/geo-core/geo/prompt-key";
import {
  buildBrandTerms,
  promptMentionsBrand,
} from "@notra/geo-core/geo/suggestion-keywords";
import type {
  GeoDiscoveredPrompt,
  GeoOnboardingBrandInput,
} from "@notra/geo-core/types/geo";

import { ONBOARDING_VISIBILITY_MAX_PROMPTS } from "@/constants/onboarding";
import type { VisibilityBrandDraft } from "@/types/onboarding";

export function uniqueVisibilityPrompts(
  prompts: readonly GeoDiscoveredPrompt[],
  brandTerms: string[]
): GeoDiscoveredPrompt[] {
  const seen = new Set<string>();
  const unique: GeoDiscoveredPrompt[] = [];
  for (const entry of prompts) {
    const prompt = entry.prompt.trim();
    const title = entry.title.trim();
    const key = promptKey(prompt);
    if (
      prompt.length < GEO_PROMPT_MIN_LENGTH ||
      prompt.length > GEO_PROMPT_MAX_LENGTH ||
      title.length === 0 ||
      seen.has(key) ||
      promptMentionsBrand(prompt, brandTerms)
    ) {
      continue;
    }
    seen.add(key);
    unique.push({ prompt, title });
  }
  return unique.slice(0, ONBOARDING_VISIBILITY_MAX_PROMPTS);
}

export function selectedVisibilityPrompts(
  prompts: readonly GeoDiscoveredPrompt[],
  droppedKeys: ReadonlySet<string>
): GeoDiscoveredPrompt[] {
  return prompts.filter((entry) => !droppedKeys.has(promptKey(entry.prompt)));
}

export function toVisibilityBrandInput(
  input: VisibilityBrandDraft
): Omit<GeoOnboardingBrandInput, "organizationId" | "projectId"> {
  return {
    companyName: input.companyName.trim(),
    aliases: input.aliases.flatMap((alias) => {
      const trimmed = alias.trim();
      return trimmed ? [trimmed] : [];
    }),
    prompts: uniqueVisibilityPrompts(
      input.prompts,
      buildBrandTerms({
        companyName: input.companyName,
        aliases: [...input.aliases],
      })
    ),
  };
}
