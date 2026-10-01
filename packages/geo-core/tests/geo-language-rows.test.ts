import { expect, test } from "bun:test";

import { withPromptLanguage } from "../src/utils/geo-language-rows";

test("keeps a list that already tracks the prompt language", () => {
  expect(withPromptLanguage(["English", "German"], "German")).toEqual([
    "English",
    "German",
  ]);
});

test("puts a missing prompt language back first", () => {
  expect(withPromptLanguage(["English"], "German")).toEqual([
    "German",
    "English",
  ]);
});

test("dedupes before checking for room", () => {
  expect(
    withPromptLanguage(["French", "Spanish", "French", "Italian"], "German")
  ).toEqual(["German", "French", "Spanish", "Italian"]);
});

test("has no room next to four other languages", () => {
  expect(
    withPromptLanguage(["English", "French", "Spanish", "Italian"], "German")
  ).toBeNull();
});

test("leaves projects without a prompt language alone", () => {
  expect(withPromptLanguage(["German"], null)).toEqual(["German"]);
});
