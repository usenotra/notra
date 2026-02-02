import { buildChangelogPrompt } from "./base";
import { toneConfigs, type ChangelogPromptParams } from "./types";

export function getFormalChangelogPrompt(
  params: ChangelogPromptParams,
): string {
  return buildChangelogPrompt(params, toneConfigs.Formal);
}
