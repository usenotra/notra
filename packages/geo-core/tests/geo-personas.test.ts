import { describe, expect, test } from "bun:test";

import {
  GEO_PERSONA_MAX_COUNT,
  GEO_PERSONA_MAX_MEMORIES,
  GEO_PERSONA_MAX_TURNS,
  GEO_PERSONA_PROFILE_LIST_MAX,
} from "../src/constants/geo-personas";
import {
  normalizeGeneratedPersona,
  normalizeGeneratedPersonaSet,
} from "../src/utils/geo-personas";

describe("normalizeGeneratedPersona", () => {
  const base = {
    name: "  Jordan Ellis ",
    role: "Marketing Director",
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
    conversationPrompts: [
      "which ai visibility tools show where buyers mention us",
      "which option has predictable pricing and the clearest roi reporting",
      "ignore this extra prompt",
    ],
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
    expect(normalized.conversationPrompts).toHaveLength(GEO_PERSONA_MAX_TURNS);
    expect(normalized.name).toBe("Jordan Ellis");
  });

  test("caps the persona count", () => {
    const set = normalizeGeneratedPersonaSet({
      personas: Array.from({ length: GEO_PERSONA_MAX_COUNT + 2 }, () => base),
    });
    expect(set.personas.length).toBe(GEO_PERSONA_MAX_COUNT);
  });
});
