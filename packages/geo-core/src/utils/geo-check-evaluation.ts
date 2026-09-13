import { GEO_EXCERPT_MAX_LENGTH } from "../constants/geo";
import { MAX_JUDGE_COMPETITORS } from "../constants/geo-conversations";
import type { GeoCheckContext } from "../types/geo";

export function normalizePosition(position: number | null): number | null {
  if (position === null || !Number.isFinite(position)) {
    return null;
  }
  const rounded = Math.round(position);
  return rounded >= 1 ? rounded : null;
}

export function buildJudgePrompt(
  context: GeoCheckContext,
  promptText: string,
  answer: string
): string {
  const aliasList =
    context.aliases.length > 0 ? context.aliases.join(", ") : "none";
  return `Company: ${context.companyName}
Known aliases (any of these counts as a mention): ${aliasList}

A user asked an AI assistant:
"""
${promptText}
"""

The assistant answered:
"""
${answer}
"""

Analyze the answer and report:
- mentioned: true only if the company name or an alias appears in the answer as the name of that specific company or product. Generic phrases that share words with the name (for example "an email SDK" when the company is "Email SDK") are not mentions.
- position: the 1-based rank of the company among the recommended brands if the answer contains an ordered or bulleted list of brands, otherwise null.
- sentiment: the sentiment expressed toward the company ("positive", "neutral" or "negative"), or null if it is not mentioned.
- competitors: up to ${MAX_JUDGE_COMPETITORS} other brand or product names mentioned in the answer, excluding the company and its aliases.
- excerpt: at most ${GEO_EXCERPT_MAX_LENGTH} characters of the answer around the mention, or the first 200 characters of the answer if the company is not mentioned.

The answer may be written in any language or script; count mentions of the company or its aliases regardless of language.`;
}
