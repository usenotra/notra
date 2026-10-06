import { describe, expect, test } from "bun:test";

import { NOTRA_AGENT_FEEDBACK_PROMPT } from "@notra/utils/constants/agent-feedback-prompt";

import { MCP_USE_CASES } from "@/constants/mcp-use-cases";
import { buildMcpUseCaseMarkdown } from "@/lib/mcp/markdown";

import { FEEDBACK_MD_SETUP_PROMPT, FEEDBACK_MD_TEMPLATE } from "./constants";
import { buildFeedbackMdPageMarkdown } from "./markdown";

describe("copyable agent prompt feedback", () => {
  test("includes the same optional section in every MCP workflow and Markdown twin", () => {
    expect(MCP_USE_CASES.length).toBeGreaterThan(0);
    for (const entry of MCP_USE_CASES) {
      expect(entry.stack).toContain("notra");
      expect(entry.prompt.endsWith(NOTRA_AGENT_FEEDBACK_PROMPT)).toBe(true);
      expect(entry.prompt.split(NOTRA_AGENT_FEEDBACK_PROMPT)).toHaveLength(2);
      expect(entry.prompt.indexOf(NOTRA_AGENT_FEEDBACK_PROMPT)).toBeGreaterThan(
        0
      );
      expect(buildMcpUseCaseMarkdown(entry.slug)).toContain(entry.prompt);
    }
  });

  test("keeps the provider-independent feedback.md setup and template free of Notra feedback requests", () => {
    expect(FEEDBACK_MD_SETUP_PROMPT).toContain(
      "ask me for the URL or address where agent feedback should go"
    );
    expect(FEEDBACK_MD_SETUP_PROMPT).not.toContain(NOTRA_AGENT_FEEDBACK_PROMPT);
    expect(FEEDBACK_MD_SETUP_PROMPT).not.toContain(
      "https://www.usenotra.com/feedback.md"
    );
    expect(buildFeedbackMdPageMarkdown()).toContain(FEEDBACK_MD_SETUP_PROMPT);
    expect(FEEDBACK_MD_TEMPLATE).not.toContain(NOTRA_AGENT_FEEDBACK_PROMPT);
  });
});
