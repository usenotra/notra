import { describe, expect, test } from "bun:test";

import { createCommentSchema, reactCommentSchema } from "@/schemas/comments";
import { assertCommentAuthor, replyDepth } from "@/utils/comment-permissions";
import { commentSubmitId } from "@/utils/comment-submit-id";

const target = {
  organizationId: "org-1",
  targetId: "feedback-1",
  targetType: "feedback" as const,
};

describe("discussion boundaries", () => {
  test("allows five reply levels, rejects a sixth and replies to deleted comments", () => {
    expect(replyDepth(null)).toBe(0);
    for (let depth = 0; depth < 5; depth++) {
      expect(replyDepth({ depth, deletedAt: null })).toBe(depth + 1);
    }
    expect(() => replyDepth({ depth: 5, deletedAt: null })).toThrow();
    expect(() => replyDepth({ depth: 0, deletedAt: new Date() })).toThrow();
  });
  test("only the author can edit or delete, including after account deletion", () => {
    expect(() => assertCommentAuthor("author", "author")).not.toThrow();
    expect(() => assertCommentAuthor("author", "another-member")).toThrow();
    expect(() => assertCommentAuthor(null, "another-member")).toThrow();
  });
  test("rejects blank and oversized comments and trims text", () => {
    const input = { ...target, id: crypto.randomUUID(), parentId: null };
    expect(
      createCommentSchema.safeParse({ ...input, body: "  \n " }).success
    ).toBe(false);
    expect(
      createCommentSchema.safeParse({ ...input, body: "x".repeat(10001) })
        .success
    ).toBe(false);
    expect(
      createCommentSchema.parse({ ...input, body: "  hello  " }).body
    ).toBe("hello");
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
  test("reactions require a supported emoji and explicit intended state", () => {
    expect(
      reactCommentSchema.safeParse({
        ...target,
        commentId: "c",
        emoji: "👍",
        active: true,
      }).success
    ).toBe(true);
    expect(
      reactCommentSchema.safeParse({
        ...target,
        commentId: "c",
        emoji: "unknown",
        active: true,
      }).success
    ).toBe(false);
    expect(
      reactCommentSchema.safeParse({ ...target, commentId: "c", emoji: "👍" })
        .success
    ).toBe(false);
  });
});
