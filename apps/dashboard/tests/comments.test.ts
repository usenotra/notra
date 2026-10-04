import { describe, expect, test } from "bun:test";

import { assertCommentAuthor } from "@/utils/comment-permissions";
import { commentSubmitId } from "@/utils/comment-submit-id";

describe("discussion boundaries", () => {
  test("only the author can edit or delete, including after account deletion", () => {
    expect(() => assertCommentAuthor("author", "author")).not.toThrow();
    expect(() => assertCommentAuthor("author", "another-member")).toThrow();
    expect(() => assertCommentAuthor(null, "another-member")).toThrow();
  });
  test("retries reuse the original client id for the same body and parent", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const retry = { id, body: "hello", parentId: null };
    expect(commentSubmitId(retry, "hello", null)).toBe(id);
    expect(commentSubmitId({ ...retry, parentId: "p" }, "hello", "p")).toBe(id);
    expect(commentSubmitId(retry, "other", null)).not.toBe(id);
    expect(commentSubmitId(null, "hello", null)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
});
