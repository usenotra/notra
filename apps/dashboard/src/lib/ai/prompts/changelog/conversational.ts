import {
  buildChangelogPrompt,
  toneConfigs,
  type ChangelogPromptParams,
} from "./base";

export function getConversationalChangelogPrompt(
  params: ChangelogPromptParams,
): string {
  return buildChangelogPrompt(params, toneConfigs.Conversational);
}
