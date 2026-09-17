import { describe, expect, test } from "bun:test";

import {
  applyAutoPromptChange,
  buildGeoPrompts,
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

describe("buildGeoPrompts", () => {
  test("derives the category from what a company builds, not how it describes itself", () => {
    const prompts = buildGeoPrompts(SETTINGS, {
      companyDescription:
        "Acme is a developer-tools/cloud-ai startup building efficient deployment workflows for engineering teams.",
      audience: null,
    });
    for (const prompt of prompts) {
      expect(prompt.text).toContain("efficient deployment workflows");
      expect(prompt.text).not.toContain("startup");
      expect(prompt.text).not.toContain("/");
    }
  });

  test("drops the audience tail from a description without a verb", () => {
    const prompts = buildGeoPrompts(SETTINGS, {
      companyDescription:
        "AI content and GEO platform for modern marketing teams.",
      audience: null,
    });
    expect(prompts[0]?.text).toBe(
      "what's the best option for ai content and geo right now"
    );
  });

  test("keeps a trailing for-clause that defines the domain rather than an audience", () => {
    const prompts = buildGeoPrompts(SETTINGS, {
      companyDescription:
        "Enterprise compliance software for the maritime logistics industry.",
      audience: null,
    });
    expect(prompts[0]?.text).toContain("maritime logistics");
  });

  test("reads the action after a helps-clause regardless of audience length", () => {
    const prompts = buildGeoPrompts(SETTINGS, {
      companyDescription:
        "Acme is a provider that helps B2B sales teams close more deals.",
      audience: null,
    });
    expect(prompts[0]?.text).toBe(
      "what's the best option for close more deals right now"
    );
  });

  test("strips short plural audience tails that are not in the audience noun list", () => {
    const students = buildGeoPrompts(SETTINGS, {
      companyDescription: "AI content platform for students.",
      audience: null,
    });
    expect(students[0]?.text).toBe(
      "what's the best option for ai content right now"
    );
    const freelancers = buildGeoPrompts(SETTINGS, {
      companyDescription: "Acme is an invoicing tool for freelancers.",
      audience: null,
    });
    expect(freelancers[0]?.text).toBe(
      "what's the best option for invoicing right now"
    );
  });

  test("keeps a for-clause that names a domain object", () => {
    const prompts = buildGeoPrompts(SETTINGS, {
      companyDescription: "Deployment tooling for kubernetes clusters.",
      audience: null,
    });
    expect(prompts[0]?.text).toContain(
      "deployment tooling for kubernetes clusters"
    );
  });

  test("does not treat domain nouns with people-like endings as audiences", () => {
    const prompts = buildGeoPrompts(SETTINGS, {
      companyDescription: "Monitoring tooling for plants.",
      audience: null,
    });
    expect(prompts[0]?.text).toContain("monitoring tooling for plants");
  });

  test("takes the verb after the audience when an audience word is also a verb", () => {
    const prompts = buildGeoPrompts(SETTINGS, {
      companyDescription:
        "Acme is a company that helps track teams find their best times.",
      audience: null,
    });
    expect(prompts[0]?.text).toBe(
      "what's the best option for find their best times right now"
    );
  });

  test("every auto prompt opens differently and reads like a typed message", () => {
    const prompts = buildGeoPrompts(SETTINGS, {
      companyDescription: "A writing platform for teams",
      audience: "content marketers",
    });
    const openers = new Set(
      prompts.map((prompt) => prompt.text.split(" ").slice(0, 2).join(" "))
    );
    expect(openers.size).toBe(prompts.length);
    for (const prompt of prompts) {
      expect(prompt.text).toBe(prompt.text.toLowerCase());
      expect(prompt.text.endsWith("?")).toBe(false);
    }
  });
});
