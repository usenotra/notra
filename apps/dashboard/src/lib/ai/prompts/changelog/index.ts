import type { ToneProfile } from "@/utils/schemas/brand";
import { getProfessionalChangelogPrompt } from "./professional";
import { getCasualChangelogPrompt } from "./casual";
import { getConversationalChangelogPrompt } from "./conversational";
import { getFormalChangelogPrompt } from "./formal";
import type { ChangelogPromptParams } from "./types";

export * from "./types";
export { buildChangelogPrompt } from "./base";
export { getProfessionalChangelogPrompt } from "./professional";
export { getCasualChangelogPrompt } from "./casual";
export { getConversationalChangelogPrompt } from "./conversational";
export { getFormalChangelogPrompt } from "./formal";

const promptByTone: Record<
  ToneProfile,
  (params: ChangelogPromptParams) => string
> = {
  Professional: getProfessionalChangelogPrompt,
  Casual: getCasualChangelogPrompt,
  Conversational: getConversationalChangelogPrompt,
  Formal: getFormalChangelogPrompt,
};

export function getChangelogPromptByTone(
  tone: ToneProfile,
  params: ChangelogPromptParams,
): string {
  const promptFn = promptByTone[tone];
  if (!promptFn) {
    throw new Error(`Unknown tone profile: ${tone}`);
  }
  return promptFn(params);
}
