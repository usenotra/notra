import { expect, test } from "bun:test";

import { filterSkills, skillDisplayName } from "./skills";

test("turns kebab skill names into a display label", () => {
  expect(skillDisplayName("blog-post")).toBe("Blog Post");
  expect(skillDisplayName("humanizer")).toBe("Humanizer");
  expect(skillDisplayName("changelog")).toBe("Changelog");
});

test("search matches a skill's display name", () => {
  const skills = [
    {
      id: "1",
      name: "blog-post",
      description: "Long-form prose",
      isSystem: true,
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  expect(filterSkills(skills, "blog post")).toHaveLength(1);
  expect(filterSkills(skills, "blog")).toHaveLength(1);
  expect(filterSkills(skills, "missing")).toHaveLength(0);
});
