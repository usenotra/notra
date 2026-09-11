import { describe, expect, test } from "bun:test";

import {
  applyAutoPromptChange,
  customPromptScanId,
  generatedAutoPromptIds,
  isGeoAutoPromptId,
  shouldSkipUnmatchedGapScan,
  toAutoTrackedPrompts,
} from "../src/geo/prompts";

const SETTINGS = { companyName: "Acme", aliases: [] as string[] };

describe("applyAutoPromptChange", () => {
  test("applies pause then remove without dropping the earlier pause of another id", () => {
    const paused = applyAutoPromptChange([], [], "best-tools", "pause");
    const next = applyAutoPromptChange(
      paused.pausedAutoPromptIds,
      paused.removedAutoPromptIds,
      "alternatives",
      "remove"
    );
    expect(next.pausedAutoPromptIds).toEqual(["best-tools"]);
    expect(next.removedAutoPromptIds).toEqual(["alternatives"]);
  });

  test("remove tombstones the id and clears a pause on the same prompt", () => {
    const next = applyAutoPromptChange(
      ["best-tools"],
      [],
      "best-tools",
      "remove"
    );
    expect(next.pausedAutoPromptIds).toEqual([]);
    expect(next.removedAutoPromptIds).toEqual(["best-tools"]);
  });

  test("does not pause an already removed prompt", () => {
    const next = applyAutoPromptChange(
      [],
      ["best-tools"],
      "best-tools",
      "pause"
    );
    expect(next.pausedAutoPromptIds).toEqual([]);
    expect(next.removedAutoPromptIds).toEqual(["best-tools"]);
  });
});

describe("generatedAutoPromptIds", () => {
  test("omits audience-specific when the project has no usable audience", () => {
    const ids = generatedAutoPromptIds(SETTINGS, {
      companyDescription: "A writing platform for teams",
      audience: null,
    });
    expect(ids.has("best-tools")).toBe(true);
    expect(ids.has("audience-specific")).toBe(false);
    expect(isGeoAutoPromptId("audience-specific")).toBe(true);
  });

  test("includes audience-specific when the project has an audience", () => {
    const ids = generatedAutoPromptIds(SETTINGS, {
      companyDescription: "A writing platform for teams",
      audience: "content marketers",
    });
    expect(ids.has("audience-specific")).toBe(true);
  });
});

describe("toAutoTrackedPrompts", () => {
  test("drops removed auto prompts from the tracked list", () => {
    const prompts = toAutoTrackedPrompts(
      [
        { id: "best-tools", text: "what tools should I use for writing" },
        { id: "alternatives", text: "what's a good alternative for writing" },
      ],
      [],
      ["best-tools"]
    );
    expect(prompts.map((prompt) => prompt.id)).toEqual(["alternatives"]);
  });
});

describe("shouldSkipUnmatchedGapScan", () => {
  test("skips a removed auto prompt so it cannot remain an opportunity", () => {
    expect(
      shouldSkipUnmatchedGapScan(
        "best-tools",
        new Set(),
        new Set(["best-tools"])
      )
    ).toBe(true);
  });

  test("keeps an unmatched auto prompt that is still tracked", () => {
    expect(shouldSkipUnmatchedGapScan("best-tools", new Set(), new Set())).toBe(
      false
    );
  });

  test("skips custom and conversation scan ids", () => {
    expect(
      shouldSkipUnmatchedGapScan(
        customPromptScanId("prompt-1"),
        new Set(),
        new Set()
      )
    ).toBe(true);
    expect(
      shouldSkipUnmatchedGapScan("sequence-abc", new Set(), new Set())
    ).toBe(true);
  });
});
