import {
  buildChangelogPrompt,
  type ChangelogPromptParams,
  toneConfigs,
} from "./base";

export function getFormalChangelogPrompt(
  params: ChangelogPromptParams
): string {
  return buildChangelogPrompt(params, toneConfigs.Formal);
}
