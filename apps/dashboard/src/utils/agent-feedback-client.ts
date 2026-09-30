import {
  AGENT_FEEDBACK_CLIENT_BRAND_RULES,
  AGENT_FEEDBACK_CLIENT_WORD_LABELS,
} from "@/constants/agent-feedback";
import type { AgentFeedbackClientBrand } from "@/types/agent-feedback";

export function normalizeAgentClient(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const CLIENT_SLUG_PATTERN = /^[a-z0-9]+(?:[-_.][a-z0-9]+)*$/;
const CLIENT_SLUG_SEPARATOR = /[-_.]/;

/**
 * Turns slug client names like `notra-mcp` into `Notra MCP`. Names that
 * already carry their own casing or spacing are left alone.
 */
export function formatAgentFeedbackClient(client: string): string {
  const trimmed = client.trim();
  if (!CLIENT_SLUG_PATTERN.test(trimmed)) {
    return trimmed;
  }
  return trimmed
    .split(CLIENT_SLUG_SEPARATOR)
    .map(
      (word) =>
        AGENT_FEEDBACK_CLIENT_WORD_LABELS[word] ??
        `${word.charAt(0).toUpperCase()}${word.slice(1)}`
    )
    .join(" ");
}

function matchesAlias(normalized: string, alias: string): boolean {
  if (normalized === alias) {
    return true;
  }
  return (
    normalized.startsWith(`${alias} `) ||
    normalized.endsWith(` ${alias}`) ||
    normalized.includes(` ${alias} `)
  );
}

export function resolveAgentFeedbackClientBrand(
  client: string | null | undefined
): AgentFeedbackClientBrand | null {
  if (!client) {
    return null;
  }
  const normalized = normalizeAgentClient(client);
  if (normalized.length === 0) {
    return null;
  }
  for (const rule of AGENT_FEEDBACK_CLIENT_BRAND_RULES) {
    if (rule.aliases.some((alias) => matchesAlias(normalized, alias))) {
      return rule.brand;
    }
  }
  return null;
}

export function agentFeedbackClientInitial(client: string): string {
  const normalized = normalizeAgentClient(client);
  return normalized.charAt(0).toUpperCase();
}
