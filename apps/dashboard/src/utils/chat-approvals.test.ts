import { describe, expect, test } from "bun:test";

import type { UIMessage } from "ai";

import { shouldContinueAfterApprovalResponse } from "./chat-approvals";

function assistantMessage(parts: UIMessage["parts"]): UIMessage {
  return {
    id: "assistant-1",
    role: "assistant",
    parts,
  };
}

function respondedPart(approved: boolean) {
  return {
    type: "tool-createBlogPost" as const,
    toolCallId: "call-1",
    state: "approval-responded" as const,
    input: {},
    approval: {
      id: "approval-1",
      approved,
    },
  };
}

function requestedPart() {
  return {
    type: "tool-createBlogPost" as const,
    toolCallId: "call-1",
    state: "approval-requested" as const,
    input: {},
    approval: {
      id: "approval-1",
    },
  };
}

describe("shouldContinueAfterApprovalResponse", () => {
  test("continues after the last step is fully approved", () => {
    expect(
      shouldContinueAfterApprovalResponse({
        messages: [
          assistantMessage([{ type: "step-start" }, respondedPart(true)]),
        ],
      })
    ).toBe(true);
  });

  test("does not continue after a denial", () => {
    expect(
      shouldContinueAfterApprovalResponse({
        messages: [
          assistantMessage([{ type: "step-start" }, respondedPart(false)]),
        ],
      })
    ).toBe(false);
  });

  test("does not continue while approval is still requested", () => {
    expect(
      shouldContinueAfterApprovalResponse({
        messages: [assistantMessage([{ type: "step-start" }, requestedPart()])],
      })
    ).toBe(false);
  });
});
