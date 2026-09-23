import { describe, expect, test } from "bun:test";

import {
  groupAssistantMessageParts,
  stackAssistantActivityItems,
} from "./group-assistant-message-parts";

function text(value: string) {
  return { type: "text" as const, text: value };
}

function reasoning(value: string, state: "streaming" | "done" = "done") {
  return { type: "reasoning" as const, text: value, state };
}

function tool(name: string) {
  return {
    type: `tool-${name}` as const,
    toolCallId: `${name}-1`,
    state: "output-available" as const,
    input: name === "webSearch" ? { query: "latency" } : {},
    output: {},
  };
}

describe("groupAssistantMessageParts", () => {
  test("groups consecutive reasoning and tools until visible text", () => {
    const segments = groupAssistantMessageParts([
      reasoning("Planning the research"),
      tool("webSearch"),
      tool("webSearch"),
      text("Here is the brief."),
    ]);

    expect(segments.map((segment) => segment.kind)).toEqual([
      "activity",
      "standalone",
    ]);
    if (segments[0]?.kind !== "activity") {
      throw new Error("expected activity");
    }
    expect(segments[0].items).toHaveLength(3);
  });

  test("does not split a group on empty text or step-start parts", () => {
    const segments = groupAssistantMessageParts([
      reasoning("Checking sources"),
      { type: "step-start" as const },
      text("   "),
      tool("fetchWebpage"),
      text("Done."),
    ]);

    expect(segments.map((segment) => segment.kind)).toEqual([
      "activity",
      "standalone",
    ]);
    if (segments[0]?.kind !== "activity") {
      throw new Error("expected activity");
    }
    expect(segments[0].items.map((item) => item.part.type)).toEqual([
      "reasoning",
      "tool-fetchWebpage",
    ]);
  });

  test("keeps create tools standalone when asked", () => {
    const segments = groupAssistantMessageParts(
      [reasoning("Drafting"), tool("createBlogPost"), text("Saved.")],
      {
        isStandaloneTool: (part) =>
          "type" in part && part.type === "tool-createBlogPost",
      }
    );

    expect(segments.map((segment) => segment.kind)).toEqual([
      "activity",
      "standalone",
      "standalone",
    ]);
  });
});

describe("stackAssistantActivityItems", () => {
  test("stacks consecutive web searches", () => {
    const stacked = stackAssistantActivityItems([
      { part: reasoning("Looking this up"), index: 0 },
      { part: tool("webSearch"), index: 1 },
      { part: tool("search"), index: 2 },
      { part: tool("fetchWebpage"), index: 3 },
    ]);

    expect(stacked.map((item) => item.kind)).toEqual([
      "part",
      "searches",
      "part",
    ]);
    if (stacked[1]?.kind !== "searches") {
      throw new Error("expected searches");
    }
    expect(stacked[1].items).toHaveLength(2);
  });
});
