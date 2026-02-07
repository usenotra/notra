import {
  buildChangelogPrompt,
  type ChangelogPromptParams,
  toneConfigs,
} from "./base";

export function getCasualChangelogPrompt(
  params: ChangelogPromptParams
): string {
  return buildChangelogPrompt(params, toneConfigs.Casual);
}
