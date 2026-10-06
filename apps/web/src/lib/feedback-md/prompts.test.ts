import { describe, expect, test } from "bun:test";

import { NOTRA_AGENT_FEEDBACK_PROMPT } from "@notra/utils/constants/agent-feedback-prompt";

import { MCP_USE_CASES } from "@/constants/mcp-use-cases";
import { buildMcpUseCaseMarkdown } from "@/lib/mcp/markdown";

import { FEEDBACK_MD_SETUP_PROMPT, FEEDBACK_MD_TEMPLATE } from "./constants";
import { buildFeedbackMdPageMarkdown } from "./markdown";

describe("copyable agent prompt feedback", () => {
  test("keeps MCP usage recipes and Markdown twins free of setup-feedback requests", () => {
    expect(MCP_USE_CASES.length).toBeGreaterThan(0);
    for (const entry of MCP_USE_CASES) {
      expect(entry.stack).toContain("notra");
      expect(entry.prompt).not.toContain(NOTRA_AGENT_FEEDBACK_PROMPT);
      expect(entry.prompt).not.toContain(
        "https://www.usenotra.com/feedback.md"
      );
      const markdown = buildMcpUseCaseMarkdown(entry.slug);
      expect(markdown).toContain(entry.prompt);
      expect(markdown).not.toContain(NOTRA_AGENT_FEEDBACK_PROMPT);
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
