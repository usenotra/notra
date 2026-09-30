import { describe, expect, test } from "bun:test";

import { createPersonaSnapshot } from "@notra/db/utils/persona-snapshot";

import {
  GEO_PERSONA_MAX_COUNT,
  GEO_PERSONA_MAX_MEMORIES,
  GEO_PERSONA_MAX_TURNS,
  GEO_PERSONA_MIN_MEMORIES,
  GEO_PERSONA_PROMPT_MAX_LENGTH,
  GEO_PERSONA_PROFILE_LIST_MAX,
} from "../src/constants/geo-personas";
import {
  geoGeneratedPersonaSchema,
  geoPersonaResultsInputSchema,
} from "../src/schemas/geo-personas";
import {
  normalizeGeneratedPersona,
  normalizeGeneratedPersonaSet,
  personaPromptId,
} from "../src/utils/geo-personas";
import { geoScanPersonaTasks } from "../src/utils/geo-scan-plan";

const PERSONA_ID = "3f0a1c6e-6f6f-4d3b-9b7a-1a2b3c4d5e6f";

describe("personaPromptId", () => {
  test("prefixes the persona id", () => {
    expect(personaPromptId(PERSONA_ID)).toBe(`persona-${PERSONA_ID}`);
  });
});

describe("geoPersonaResultsInputSchema", () => {
  test("requires a persona when selecting a scan", () => {
    const input = { organizationId: "org", scanId: "scan" };
    expect(geoPersonaResultsInputSchema.safeParse(input).success).toBe(false);
    expect(
      geoPersonaResultsInputSchema.safeParse({
        ...input,
        personaId: PERSONA_ID,
      }).success
    ).toBe(true);
  });
});

describe("createPersonaSnapshot", () => {
  test("writes the current version discriminator", () => {
    const snapshot = createPersonaSnapshot(
      {
        id: PERSONA_ID,
        name: "Budgeter",
        role: "Founder",
        company: "Small SaaS company",
        summary: "Optimizes for predictable ROI",
        searchStyle: "Direct and concise",
        profile: {
          goals: ["Reduce spend"],
          painPoints: ["Unclear pricing"],
          currentStack: ["HubSpot"],
          buyingTriggers: ["Budget review"],
          objections: ["Long setup"],
        },
      },
      [],
      ["Which tools have predictable pricing?"]
    );

    expect(snapshot.schemaVersion).toBe(2);
    expect(snapshot.conversationPrompts).toEqual([
      "Which tools have predictable pricing?",
    ]);
  });
});

describe("geoScanPersonaTasks", () => {
  test("uses the same fixed prompts for every engine", () => {
    const prompts = ["opening question", "fixed follow-up"];
    const first = geoScanPersonaTasks({
      personaId: PERSONA_ID,
      prompts,
      engine: "test/first-grounded",
    });
    const second = geoScanPersonaTasks({
      personaId: PERSONA_ID,
      prompts,
      engine: "test/second-grounded",
    });

    expect(first.map((task) => task.prompt)).toEqual(prompts);
    expect(second.map((task) => task.prompt)).toEqual(prompts);
  });
});

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

  test("drops duplicate list items regardless of case and whitespace", () => {
    expect(normalizeGeneratedPersona(base).buyingTriggers.join(",")).toBe("c");
  });

  test("clips overlong prompts after model output validation", () => {
    const overlongPrompt = "x".repeat(GEO_PERSONA_PROMPT_MAX_LENGTH + 1);
    const generated = {
      ...base,
      conversationPrompts: [overlongPrompt, "fixed follow-up"],
    };

    expect(geoGeneratedPersonaSchema.safeParse(generated).success).toBe(true);
    expect(
      normalizeGeneratedPersona(generated).conversationPrompts[0]
    ).toHaveLength(GEO_PERSONA_PROMPT_MAX_LENGTH);
  });

  test("caps the persona count", () => {
    const set = normalizeGeneratedPersonaSet({
      personas: Array.from({ length: GEO_PERSONA_MAX_COUNT + 2 }, () => base),
    });
    expect(set.personas.length).toBe(GEO_PERSONA_MAX_COUNT);
  });

  test("requires the documented minimum memory set", () => {
    const generated = {
      ...base,
      memories: Array.from(
        { length: GEO_PERSONA_MIN_MEMORIES },
        (_, index) => ({
          kind: "background" as const,
          content: `memory ${index}`,
        })
      ),
    };

    expect(geoGeneratedPersonaSchema.safeParse(generated).success).toBe(true);
    expect(
      geoGeneratedPersonaSchema.safeParse({
        ...generated,
        memories: generated.memories.slice(1),
      }).success
    ).toBe(false);
    expect(
      geoGeneratedPersonaSchema.safeParse({
        ...generated,
        conversationPrompts: generated.conversationPrompts.slice(2),
      }).success
    ).toBe(false);
  });
});
