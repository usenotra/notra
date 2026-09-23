import { expect, test } from "bun:test";

import { renderSkillGuidance } from "./guidance";

test("tells the model to load slash-tagged skills", () => {
  const guidance = renderSkillGuidance([
    { name: "humanizer", description: "Remove AI-sounding prose" },
  ]);

  expect(guidance).toContain("/skill-name");
  expect(guidance).toContain("getSkillByName");
  expect(guidance).toContain("humanizer: Remove AI-sounding prose");
});
