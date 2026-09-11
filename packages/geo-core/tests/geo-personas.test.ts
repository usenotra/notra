import { describe, expect, test } from "bun:test";

import {
  GEO_PERSONA_MAX_COUNT,
  GEO_PERSONA_MAX_MEMORIES,
  GEO_PERSONA_PROFILE_LIST_MAX,
} from "../src/constants/geo-personas";
import {
  isPersonaScanPromptId,
  normalizeGeneratedPersona,
  normalizeGeneratedPersonaSet,
  personaPromptId,
} from "../src/utils/geo-personas";

const PERSONA_ID = "3f0a1c6e-6f6f-4d3b-9b7a-1a2b3c4d5e6f";

describe("personaPromptId", () => {
  test("prefixes the persona id", () => {
    expect(personaPromptId(PERSONA_ID)).toBe(`persona-${PERSONA_ID}`);
  });

  test("round-trips through isPersonaScanPromptId", () => {
    expect(isPersonaScanPromptId(personaPromptId(PERSONA_ID))).toBe(true);
  });
});

describe("isPersonaScanPromptId", () => {
  test("rejects regular prompt ids", () => {
    expect(isPersonaScanPromptId(PERSONA_ID)).toBe(false);
    expect(isPersonaScanPromptId("sequence-1")).toBe(false);
    expect(isPersonaScanPromptId("")).toBe(false);
  });
});

describe("normalizeGeneratedPersona", () => {
  const base = {
    name: "  Jordan Ellis ",
    role: "Director of Marketing",
    company: "210-person B2B SaaS company",
    summary: "Leads a team of six.",
    searchStyle: "Formal and detailed.",
    goals: ["a"],
    painPoints: ["b"],
    currentStack: [
      "HubSpot",
      "Semrush",
      "Clearbit",
      "Slack",
      "Writer",
      "Salesforce",
      "Looker",
    ],
    buyingTriggers: ["c", "c", "C "],
    objections: ["d"],
    memories: Array.from({ length: 14 }, (_, index) => ({
      kind: "background" as const,
      content: `memory ${index}`,
    })),
  };

  test("trims lists that run past the product limits", () => {
    const normalized = normalizeGeneratedPersona(base);
    expect(normalized.currentStack.length).toBe(GEO_PERSONA_PROFILE_LIST_MAX);
    expect(normalized.currentStack[0]).toBe("HubSpot");
    expect(normalized.memories.length).toBe(GEO_PERSONA_MAX_MEMORIES);
    expect(normalized.name).toBe("Jordan Ellis");
  });

  test("drops duplicate list items regardless of case and whitespace", () => {
    expect(normalizeGeneratedPersona(base).buyingTriggers.join(",")).toBe("c");
  });

  test("caps the persona count", () => {
    const set = normalizeGeneratedPersonaSet({
      personas: Array.from({ length: GEO_PERSONA_MAX_COUNT + 2 }, () => base),
    });
    expect(set.personas.length).toBe(GEO_PERSONA_MAX_COUNT);
  });
});
