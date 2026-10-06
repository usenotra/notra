import { describe, expect, test } from "bun:test";

import type { AgentReadinessIssue } from "@notra/db/types/agent-readiness";
import {
  GEO_INGEST_FRAMEWORK_OPTIONS,
  GEO_INGEST_PACKAGE_MANAGER_OPTIONS,
} from "@notra/geo-core/constants/geo";
import {
  buildAgentReadinessAllFixesPrompt,
  buildAgentReadinessFixPrompt,
} from "@notra/geo-core/utils/agent-readiness";
import { NOTRA_AGENT_FEEDBACK_PROMPT } from "@notra/utils/constants/agent-feedback-prompt";

import { buildAgentFeedbackSetup } from "@/lib/agent-feedback/snippet";

import { geoIngestAgentPrompt } from "./geo-ingest";

describe("optional Notra feedback in agent prompts", () => {
  test("keeps every GEO framework and package manager setup intact", () => {
    for (const framework of GEO_INGEST_FRAMEWORK_OPTIONS) {
      for (const manager of GEO_INGEST_PACKAGE_MANAGER_OPTIONS) {
        const prompt = geoIngestAgentPrompt(
          undefined,
          framework.value,
          manager.value
        );
        expect(prompt).toContain(framework.label);
        expect(prompt).toContain(framework.file);
        expect(prompt).toContain(manager.command);
        expect(prompt).toContain("never hardcode or commit it");
        expect(prompt.endsWith(NOTRA_AGENT_FEEDBACK_PROMPT)).toBe(true);
        expect(prompt.split(NOTRA_AGENT_FEEDBACK_PROMPT)).toHaveLength(2);
        if (framework.value === "astro") {
          expect(prompt).toContain('output: "server"');
        }
      }
    }
  });

  test("keeps customer feedback setup separate from feedback about Notra", () => {
    const setup = buildAgentFeedbackSetup({
      organizationName: "Example Product",
      organizationSlug: "example-product",
    });
    expect(setup.prompt).toContain("AI agents using Example Product");
    expect(setup.prompt).toContain(setup.apiUrl);
    expect(setup.prompt.endsWith(NOTRA_AGENT_FEEDBACK_PROMPT)).toBe(true);
    expect(setup.prompt.split(NOTRA_AGENT_FEEDBACK_PROMPT)).toHaveLength(2);
    for (const snippet of Object.values(setup.snippets)) {
      expect(snippet).not.toContain(NOTRA_AGENT_FEEDBACK_PROMPT);
    }
  });

  test("keeps website readiness fixes free of Notra feedback requests", () => {
    const issue: AgentReadinessIssue = {
      id: "missing-llms",
      name: "llms.txt",
      tier: "essential",
      result: "failed",
      details: "llms.txt returned 404",
      recommendation: "Serve llms.txt at the root",
    };
    const target = "https://example.com";
    const single = buildAgentReadinessFixPrompt(target, issue);
    const master = buildAgentReadinessAllFixesPrompt(target, [issue]);
    for (const prompt of [
      single,
      master,
      buildAgentReadinessAllFixesPrompt(target, []),
    ]) {
      expect(prompt).toContain(target);
      expect(prompt).not.toContain(NOTRA_AGENT_FEEDBACK_PROMPT);
      expect(prompt).not.toContain("https://www.usenotra.com/feedback.md");
    }
    expect(single).toContain("Implement this fix only");
    expect(single).toContain("llms.txt returned 404");
    expect(master).toContain("## Must do");
    expect(master).toContain("Serve llms.txt at the root");
  });

  test("requires permission and excludes telemetry and private data", () => {
    expect(NOTRA_AGENT_FEEDBACK_PROMPT).toContain("(optional)");
    expect(NOTRA_AGENT_FEEDBACK_PROMPT).toContain(
      "https://www.usenotra.com/feedback.md"
    );
    expect(NOTRA_AGENT_FEEDBACK_PROMPT).toContain("if the user allows it");
    expect(NOTRA_AGENT_FEEDBACK_PROMPT).toContain("Never include source code");
    expect(NOTRA_AGENT_FEEDBACK_PROMPT).toContain("environment values");
    expect(NOTRA_AGENT_FEEDBACK_PROMPT).toContain(
      "private workspace/customer data"
    );
    expect(NOTRA_AGENT_FEEDBACK_PROMPT).toContain(
      "query strings and fragments"
    );
    expect(NOTRA_AGENT_FEEDBACK_PROMPT).toContain(
      "Do not send per-step progress or setup telemetry"
    );
    expect(NOTRA_AGENT_FEEDBACK_PROMPT).toContain(
      "skip feedback and continue the task"
    );
  });
});
