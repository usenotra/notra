import { describe, expect, test } from "bun:test";

import { getChatSubagentResult, isChatSubagentName } from "./chat-subagents";

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

  test("reads the image designer's top-level title", () => {
    expect(
      getChatSubagentResult("image-designer", {
        status: "updated",
        title: "Launch card",
      })
    ).toEqual({ kind: "image", title: "Launch card" });
  });

  test("keeps not_found, skipped, and failed apart", () => {
    expect(
      getChatSubagentResult("code-researcher", {
        status: "not_found",
        reason: "No match",
      })
    ).toEqual({ kind: "notFound", reason: "No match" });
    expect(
      getChatSubagentResult("code-researcher", {
        status: "unavailable",
        reason: "Disabled",
      })
    ).toEqual({ kind: "skipped", reason: "Disabled" });
    expect(
      getChatSubagentResult("content-writer", {
        status: "skipped",
        reason: "No changes",
      })
    ).toEqual({ kind: "skipped", reason: "No changes" });
    expect(
      getChatSubagentResult("image-designer", {
        status: "failed",
        reason: null,
      })
    ).toEqual({ kind: "failed", reason: null });
  });

  test("returns nothing for unknown output", () => {
    expect(getChatSubagentResult("content-writer", undefined)).toBeNull();
  });
});
