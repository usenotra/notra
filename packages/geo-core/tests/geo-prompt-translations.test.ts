import { expect, test } from "bun:test";

import type { GeoPromptTranslationRecord } from "../src/types/geo";
import { planGeoPromptTranslations } from "../src/utils/geo-prompt-translations";

const prompts = Array.from({ length: 7 }, (_, index) => ({
  id: `custom-${index}`,
  text: `Frage ${index}`,
}));

function record(
  promptId: string,
  overrides: Partial<GeoPromptTranslationRecord> = {}
): GeoPromptTranslationRecord {
  const index = promptId.split("-")[1];
  return {
    promptId,
    language: "English",
    text: `Question ${index}`,
    sourceText: `Frage ${index}`,
    edited: false,
    ...overrides,
  };
}

test("a language without picks defaults to the first prompts", () => {
  const [plan] = planGeoPromptTranslations({
    prompts,
    languages: ["German", "English"],
    promptLanguage: "German",
    records: [],
  });
  expect(plan?.language).toBe("English");
  expect(plan?.defaulted).toBe(true);
  expect(plan?.entries.map((entry) => entry.promptId)).toEqual([
    "custom-0",
    "custom-1",
    "custom-2",
    "custom-3",
    "custom-4",
  ]);
  expect(plan?.entries.every((entry) => entry.needsTranslation)).toBe(true);
});

test("the prompt language itself is never translated", () => {
  expect(
    planGeoPromptTranslations({
      prompts,
      languages: ["German"],
      promptLanguage: "German",
      records: [],
    })
  ).toEqual([]);
});

test("stored picks decide which prompts are scanned, in prompt order", () => {
  const [plan] = planGeoPromptTranslations({
    prompts,
    languages: ["German", "English"],
    promptLanguage: "German",
    records: [record("custom-6"), record("custom-2", { text: null })],
  });
  expect(plan?.defaulted).toBe(false);
  expect(plan?.entries.map((entry) => entry.promptId)).toEqual([
    "custom-2",
    "custom-6",
  ]);
  expect(plan?.entries.map((entry) => entry.needsTranslation)).toEqual([
    true,
    false,
  ]);
});

test("a changed prompt is translated again unless the translation was edited", () => {
  const [plan] = planGeoPromptTranslations({
    prompts,
    languages: ["German", "English"],
    promptLanguage: "German",
    records: [
      record("custom-0", { sourceText: "old" }),
      record("custom-1", { sourceText: "old", edited: true, text: "Mine" }),
    ],
  });
  expect(plan?.entries.map((entry) => entry.needsTranslation)).toEqual([
    true,
    false,
  ]);
  expect(plan?.entries[1]?.text).toBe("Mine");
});

test("picks of paused or deleted prompts fall back to the defaults", () => {
  const [plan] = planGeoPromptTranslations({
    prompts,
    languages: ["German", "English"],
    promptLanguage: "German",
    records: [record("custom-99")],
  });
  expect(plan?.defaulted).toBe(true);
  expect(plan?.entries).toHaveLength(5);
});

test("never scans more than the limit per language", () => {
  const [plan] = planGeoPromptTranslations({
    prompts,
    languages: ["German", "English"],
    promptLanguage: "German",
    records: prompts.map((prompt) => record(prompt.id)),
  });
  expect(plan?.entries).toHaveLength(5);
});
