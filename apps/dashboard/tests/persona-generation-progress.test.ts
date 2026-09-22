import { describe, expect, test } from "bun:test";

import { GEO_PERSONA_GENERATION_STEPS } from "../src/constants/geo-personas";
import { personaGenerationFill } from "../src/lib/hooks/use-persona-generation-progress";

describe("personaGenerationFill", () => {
  test("starts at the first step fraction", () => {
    expect(personaGenerationFill(0)).toBeCloseTo(
      1 / GEO_PERSONA_GENERATION_STEPS.length
    );
  });

  test("reaches three quarters when writing memories begins", () => {
    expect(personaGenerationFill(35_000)).toBeCloseTo(0.75);
  });

  test("keeps filling during writing memories instead of jumping to full", () => {
    expect(personaGenerationFill(50_000)).toBeGreaterThan(0.75);
    expect(personaGenerationFill(50_000)).toBeLessThan(0.94);
  });

  test("holds under full on the last step", () => {
    expect(personaGenerationFill(65_000)).toBeLessThan(1);
    expect(personaGenerationFill(120_000)).toBeLessThan(1);
  });
});
