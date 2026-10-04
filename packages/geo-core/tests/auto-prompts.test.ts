import { describe, expect, test } from "bun:test";

import { applyAutoPromptChange, buildGeoPrompts } from "../src/geo/prompts";

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

describe("buildGeoPrompts", () => {
  test("skips the English templates when prompts are written in another language", () => {
    const brand = {
      companyDescription: "AI content and GEO platform for marketing teams.",
      audience: null,
    };
    expect(
      buildGeoPrompts({ ...SETTINGS, promptLanguage: "German" }, brand)
    ).toEqual([]);
    expect(
      buildGeoPrompts({ ...SETTINGS, promptLanguage: "English" }, brand).length
    ).toBeGreaterThan(0);
  });

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
});
