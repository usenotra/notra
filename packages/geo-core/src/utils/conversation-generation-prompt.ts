import {
  GEO_GENERATED_CONVERSATION_MAX_TURNS,
  GEO_GENERATED_CONVERSATION_MIN_TURNS,
  GEO_GENERATED_CONVERSATION_NAME_MAX_LENGTH,
  GEO_PROMPT_MAX_LENGTH,
  GEO_PROMPT_MIN_LENGTH,
  GEO_TRACKED_PROMPT_VOICE,
} from "../constants/geo";
import type { GeoConversationGenerationContext } from "../types/geo";

/**
 * Shared by website discovery and on-demand generation so both write the same
 * kind of conversation. Discovery has no brand identity yet and leaves
 * `language` unset, so the model infers it from the scraped site.
 */
export function geoConversationRules(
  companyName: string,
  language?: string | null
): string {
  return `Conversation rules:
- Each conversation is one buyer researching a purchase across ${GEO_GENERATED_CONVERSATION_MIN_TURNS} or ${GEO_GENERATED_CONVERSATION_MAX_TURNS} messages they send to an AI assistant, in order.
- ${GEO_TRACKED_PROMPT_VOICE}
- The first message states a real, current need without naming ${companyName}, its products, or its domain.
- Later messages narrow the research the way people do: add a constraint (budget, team size, stack, region), ask for a comparison, or ask what to watch out for. They must make sense after any plausible answer, so never refer to a specific recommendation, list position, or wording from the reply.
- Never name ${companyName}, its products, its domain, or any alias in any message.
- Give each conversation a different buyer and a different angle.
- name: a short label for the buyer or scenario, under ${GEO_GENERATED_CONVERSATION_NAME_MAX_LENGTH} characters, e.g. "Agency comparing options" or "Startup on a tight budget".
- Write every message in ${language?.trim() || "the language the audience speaks"}, each between ${GEO_PROMPT_MIN_LENGTH} and ${GEO_PROMPT_MAX_LENGTH} characters.`;
}

export function buildConversationGenerationPrompt(
  context: GeoConversationGenerationContext
): string {
  const list = (items: readonly string[]) =>
    items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- none";

  return `Company: ${context.companyName}
Description: ${context.companyDescription ?? "unknown"}
Audience: ${context.audience ?? "unknown"}

Competitors:
${list(context.competitors)}

Prompts already tracked (single questions, for tone and topics):
${list(context.prompts)}

Conversations that already exist, do not repeat their scenario:
${list(context.existingNames)}

Write exactly ${context.count} multi-turn conversations.

${geoConversationRules(context.companyName, context.language)}`;
}
