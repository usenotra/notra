import { expect, test } from "bun:test";

import { skillDisplayName } from "./skills";

test("turns kebab skill names into a display label", () => {
  expect(skillDisplayName("blog-post")).toBe("Blog Post");
  expect(skillDisplayName("humanizer")).toBe("Humanizer");
  expect(skillDisplayName("changelog")).toBe("Changelog");
});
