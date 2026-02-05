import {
  buildChangelogPrompt,
  type ChangelogPromptParams,
  toneConfigs,
} from "./base";

export function getProfessionalChangelogPrompt(
  params: ChangelogPromptParams
): string {
  return buildChangelogPrompt(params, toneConfigs.Professional);
}
