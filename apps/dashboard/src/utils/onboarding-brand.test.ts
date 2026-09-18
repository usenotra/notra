import { expect, test } from "bun:test";

import { promptKey } from "@notra/geo-core/geo/prompt-key";
import type { GeoDiscoveredPrompt } from "@notra/geo-core/types/geo";

import {
  selectedVisibilityPrompts,
  toVisibilityBrandInput,
} from "./onboarding-brand";

const kept: GeoDiscoveredPrompt = {
  prompt: "What is the best AI writing tool?",
  title: "Best tool",
};
const dropped: GeoDiscoveredPrompt = {
  prompt: "How do teams compare chatbots today?",
  title: "Compare",
};
const prompts = [kept, dropped];

test("deselected visibility prompts are omitted from the saved brand input", () => {
  const selected = selectedVisibilityPrompts(
    prompts,
    new Set([promptKey(dropped.prompt)])
  );

  expect(selected).toEqual([kept]);

  const brandInput = toVisibilityBrandInput({
    companyName: "Acme",
    aliases: [],
    prompts: selected,
  });
  expect(brandInput.prompts).toEqual([kept]);
});

test("clearing a dropped prompt key puts it back in the saved brand input", () => {
  const brandInput = toVisibilityBrandInput({
    companyName: "Acme",
    aliases: [],
    prompts: selectedVisibilityPrompts(prompts, new Set()),
  });
  expect(brandInput.prompts).toEqual(prompts);
});
