import { expect, test } from "bun:test";

import { parseCreatePostDraft } from "./chat-tool-draft";

test("only create-post tools can surface a draft preview", () => {
  const input = { title: "Draft", markdown: "Hello" };
  expect(parseCreatePostDraft(input, "createBlogPost")).toEqual(input);
  expect(parseCreatePostDraft(input, "webSearch")).toBeUndefined();
  expect(parseCreatePostDraft(input, "createImage")).toBeUndefined();
});
