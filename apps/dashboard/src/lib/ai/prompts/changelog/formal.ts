import {
  buildChangelogPrompt,
  toneConfigs,
  type ChangelogPromptParams,
} from "./base";

export function getFormalChangelogPrompt(
  params: ChangelogPromptParams,
): string {
  return buildChangelogPrompt(params, toneConfigs.Formal);
}
