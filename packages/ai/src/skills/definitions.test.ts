import { describe, expect, test } from "bun:test";

import { getSystemSkillDefinitions } from "./definitions";
import { computeSkillContentHash } from "./functions/hash";

const EXPECTED_SKILL_NAMES = [
  "changelog",
  "blog-post",
  "twitter",
  "linkedin",
  "humanizer",
];

describe("system skill definitions", () => {
  const definitions = getSystemSkillDefinitions();

  test("ships every skill the registry is expected to publish", () => {
    expect(definitions.map((definition) => definition.name)).toEqual(
      EXPECTED_SKILL_NAMES
    );
  });

  test("names are unique", () => {
    const names = new Set(definitions.map((definition) => definition.name));

    expect(names.size).toBe(definitions.length);
  });

  test("every definition carries a description and content", () => {
    for (const definition of definitions) {
      expect(definition.description.trim().length).toBeGreaterThan(0);
      expect(definition.content.trim().length).toBeGreaterThan(0);
    }
  });

  test("definitions are deterministic, so republishing is a no-op", () => {
    const hashes = definitions.map((definition) =>
      computeSkillContentHash(definition.description, definition.content)
    );
    const rebuilt = getSystemSkillDefinitions().map((definition) =>
      computeSkillContentHash(definition.description, definition.content)
    );

    expect(rebuilt).toEqual(hashes);
    expect(new Set(hashes).size).toBe(definitions.length);
  });
});
