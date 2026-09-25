import { describe, expect, test } from "bun:test";

import { isContentEditorStandaloneTool } from "./content-editor-standalone-tool";
import {
  getAssistantActivityStep,
  groupAssistantMessageParts,
  isAssistantActivityForceOpen,
  isAssistantActivityStreaming,
  stackAssistantActivityItems,
} from "./group-assistant-message-parts";

test("current step follows the latest streamed part, not a completed tool", () => {
  expect(
    getAssistantActivityStep([reasoning("Checking sources", "streaming")])
  ).toBe("Thinking");
  expect(
    getAssistantActivityStep([
      reasoning("Checking sources"),
      {
        type: "tool-webSearch",
        toolCallId: "search-1",
        state: "input-available",
        input: { query: "news" },
      },
    ])
  ).toBe("Searching web");
  expect(
    getAssistantActivityStep([
      reasoning("Checking sources"),
      {
        type: "tool-code_mode",
        toolCallId: "code-1",
        state: "input-available",
        input: {},
      },
    ])
  ).toBe("Executing tools");
  expect(getAssistantActivityStep([tool("webSearch")])).toBe("Thinking");
  expect(
    getAssistantActivityStep([tool("webSearch"), text("Here is the answer")])
  ).toBe("Writing response");
  expect(getAssistantActivityStep([])).toBe("Thinking");
});

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
  test("groups reasoning and tools above visible text", () => {
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

  test("keeps one activity above commentary across tool steps", () => {
    const parts = [
      text("Let me fetch this page."),
      tool("fetchWebpage"),
      text("Checking another source."),
      reasoning("Compare the sources"),
      tool("webSearch"),
      text("Here is the answer."),
    ];
    const segments = groupAssistantMessageParts(parts);

    expect(segments.map((segment) => segment.kind)).toEqual([
      "activity",
      "standalone",
      "standalone",
      "standalone",
    ]);
    expect(segments[0]).toMatchObject({
      kind: "activity",
      items: [{ index: 1 }, { index: 3 }, { index: 4 }],
    });
    expect(segments.slice(1).map((segment) => segment.startIndex)).toEqual([
      0, 2, 5,
    ]);
    expect(groupAssistantMessageParts(parts.slice(0, 2))[0]?.startIndex).toBe(
      segments[0]?.startIndex
    );
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

  test("keeps document edits visible outside the activity group", () => {
    const segments = groupAssistantMessageParts(
      [
        reasoning("Planning the research"),
        tool("webSearch"),
        tool("getMarkdown"),
        tool("editMarkdown"),
        text("Updated the title."),
      ],
      { isStandaloneTool: isContentEditorStandaloneTool }
    );

    expect(segments.map((segment) => segment.kind)).toEqual([
      "activity",
      "standalone",
      "standalone",
    ]);
    if (segments[0]?.kind !== "activity") {
      throw new Error("expected activity");
    }
    expect(segments[0].items.map((item) => item.part.type)).toEqual([
      "reasoning",
      "tool-webSearch",
      "tool-getMarkdown",
    ]);
    if (segments[1]?.kind !== "standalone") {
      throw new Error("expected standalone edit");
    }
    expect(segments[1].part.type).toBe("tool-editMarkdown");
  });

  test("keeps mcp calls inside the activity group", () => {
    const mcp = {
      type: "dynamic-tool" as const,
      toolName: "mcp_compliance_check_sanctions",
      toolCallId: "mcp-1",
      state: "output-error" as const,
      input: { entity: "Nordstrom Shipping GmbH" },
      errorText: "Connection timed out",
    };
    const segments = groupAssistantMessageParts(
      [reasoning("Checking lists"), mcp, tool("editMarkdown"), text("Done.")],
      { isStandaloneTool: isContentEditorStandaloneTool }
    );

    expect(segments.map((segment) => segment.kind)).toEqual([
      "activity",
      "standalone",
      "standalone",
    ]);
    if (segments[0]?.kind !== "activity") {
      throw new Error("expected activity");
    }
    expect(segments[0].items.map((item) => item.part.type)).toEqual([
      "reasoning",
      "dynamic-tool",
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

  test("keeps failed searches as tool parts", () => {
    const failedSearch = {
      type: "tool-webSearch" as const,
      toolCallId: "webSearch-err",
      state: "output-error" as const,
      input: { query: "sanctions" },
      errorText: "Connection timed out",
    };
    const failedPayload = {
      type: "tool-webSearch" as const,
      toolCallId: "webSearch-unconfigured",
      state: "output-available" as const,
      input: { query: "sanctions" },
      output: {
        success: false,
        error: "Context.dev is not configured.",
      },
    };
    const stacked = stackAssistantActivityItems([
      { part: failedSearch, index: 0 },
      { part: failedPayload, index: 1 },
      { part: tool("webSearch"), index: 2 },
    ]);

    expect(stacked.map((item) => item.kind)).toEqual([
      "part",
      "part",
      "searches",
    ]);
  });
});

describe("isAssistantActivityStreaming", () => {
  test("stays streaming after a standalone create tool while the turn is loading", () => {
    const segments = groupAssistantMessageParts(
      [reasoning("Planning the draft"), tool("createBlogPost")],
      {
        isStandaloneTool: (part) =>
          "type" in part && part.type === "tool-createBlogPost",
      }
    );

    expect(segments.map((segment) => segment.kind)).toEqual([
      "activity",
      "standalone",
    ]);
    expect(isAssistantActivityStreaming(true, true)).toBe(true);
  });

  test("stays working until the assistant finishes, even after text starts", () => {
    const segments = groupAssistantMessageParts([
      reasoning("Planning the draft"),
      text("Here is the post."),
    ]);

    expect(
      isAssistantActivityStreaming(true, segments[0]?.kind === "activity")
    ).toBe(true);
  });

  test("only the last activity streams", () => {
    expect(isAssistantActivityStreaming(true, true)).toBe(true);
    expect(isAssistantActivityStreaming(true, false)).toBe(false);
    expect(isAssistantActivityStreaming(false, true)).toBe(false);
  });
});

describe("isAssistantActivityForceOpen", () => {
  test("pins the group open for failed tools", () => {
    expect(
      isAssistantActivityForceOpen([
        {
          part: {
            type: "dynamic-tool" as const,
            toolName: "mcp_compliance_check_sanctions",
            toolCallId: "mcp-1",
            state: "output-error" as const,
            input: {},
            errorText: "Connection timed out",
          },
          index: 0,
        },
      ])
    ).toBe(true);
    expect(
      isAssistantActivityForceOpen([{ part: tool("webSearch"), index: 0 }])
    ).toBe(false);
    expect(
      isAssistantActivityForceOpen([
        {
          part: {
            type: "tool-webSearch" as const,
            toolCallId: "webSearch-unconfigured",
            state: "output-available" as const,
            input: { query: "sanctions" },
            output: {
              success: false,
              error: "Context.dev is not configured.",
            },
          },
          index: 0,
        },
      ])
    ).toBe(true);
  });
});
