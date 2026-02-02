import { buildChangelogPrompt } from "./base";
import { toneConfigs, type ChangelogPromptParams } from "./types";

export function getConversationalChangelogPrompt(
  params: ChangelogPromptParams,
): string {
  return buildChangelogPrompt(params, toneConfigs.Conversational);
}
