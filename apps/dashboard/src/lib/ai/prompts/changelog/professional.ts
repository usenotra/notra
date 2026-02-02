import {
  buildChangelogPrompt,
  toneConfigs,
  type ChangelogPromptParams,
} from "./base";

export function getProfessionalChangelogPrompt(
  params: ChangelogPromptParams,
): string {
  return buildChangelogPrompt(params, toneConfigs.Professional);
}
