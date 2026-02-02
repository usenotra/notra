import { buildChangelogPrompt } from "./base";
import { toneConfigs, type ChangelogPromptParams } from "./types";

export function getCasualChangelogPrompt(
  params: ChangelogPromptParams,
): string {
  return buildChangelogPrompt(params, toneConfigs.Casual);
}
