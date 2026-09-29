import { describe, expect, test } from "bun:test";

import {
  getChatSubagentResult,
  isChatSubagentName,
  isSkippedSubagentOutput,
} from "./chat-subagents";

describe("isChatSubagentName", () => {
  test("recognizes declared subagents only", () => {
    expect(isChatSubagentName("code-researcher")).toBe(true);
    expect(isChatSubagentName("content-writer")).toBe(true);
    expect(isChatSubagentName("open_repository")).toBe(false);
    expect(isChatSubagentName("constructor")).toBe(false);
  });
});

describe("getChatSubagentResult", () => {
  test("summarizes a found brief", () => {
    expect(
      getChatSubagentResult("code-researcher", {
        status: "found",
        feature: "Faster skills tab",
      })
    ).toEqual({ kind: "brief", feature: "Faster skills tab" });
  });

  test("summarizes a saved draft", () => {
    expect(
      getChatSubagentResult("content-writer", {
        status: "created",
        posts: [{ postId: "p1", title: "Skills got faster" }],
      })
    ).toEqual({ kind: "draft", title: "Skills got faster" });
  });

  test("marks unavailable research as skipped", () => {
    const output = { status: "unavailable", reason: "Disabled" };
    expect(getChatSubagentResult("code-researcher", output)).toEqual({
      kind: "skipped",
      reason: "Disabled",
    });
    expect(isSkippedSubagentOutput(output)).toBe(true);
  });

  test("returns nothing for unknown output", () => {
    expect(getChatSubagentResult("content-writer", undefined)).toBeNull();
    expect(isSkippedSubagentOutput({ status: "created" })).toBe(false);
  });
});
