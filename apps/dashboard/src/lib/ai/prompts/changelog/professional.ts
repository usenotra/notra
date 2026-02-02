import { buildChangelogPrompt } from "./base";
import { toneConfigs, type ChangelogPromptParams } from "./types";

export function getProfessionalChangelogPrompt(
  params: ChangelogPromptParams,
): string {
  return buildChangelogPrompt(params, toneConfigs.Professional);
}
