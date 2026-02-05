import {
  buildChangelogPrompt,
  type ChangelogPromptParams,
  toneConfigs,
} from "./base";

export function getConversationalChangelogPrompt(
  params: ChangelogPromptParams
): string {
  return buildChangelogPrompt(params, toneConfigs.Conversational);
}
