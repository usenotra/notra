import type { GeoBoxRunTarget } from "@notra/ai/types/geo-opencode";

/**
 * Native Upstash Box harness + model for Claude Code and Codex.
 * Catalog ids stay dotted (`fable-5.1`); Claude Code's model slug uses hyphens.
 * Sol Rei is the Codex picker label; the Codex harness exposes `gpt-5.6-sol`.
 */
export const GEO_BOX_CODING_AGENT_TARGETS: Readonly<
  Record<string, GeoBoxRunTarget>
> = {
  "claude-code/claude-fable-5.1": {
    harness: "claude-code",
    model: "anthropic/claude-fable-5-1",
  },
  "claude-code/claude-opus-5": {
    harness: "claude-code",
    model: "anthropic/claude-opus-5",
  },
  "codex/gpt-6-astra": {
    harness: "codex",
    model: "openai/gpt-6-astra",
  },
  "codex/gpt-5.6-sol-rei": {
    harness: "codex",
    model: "openai/gpt-5.6-sol",
  },
};
