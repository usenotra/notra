import {
  buildChangelogPrompt,
  toneConfigs,
  type ChangelogPromptParams,
} from "./base";

export function getCasualChangelogPrompt(
  params: ChangelogPromptParams,
): string {
  return buildChangelogPrompt(params, toneConfigs.Casual);
}
