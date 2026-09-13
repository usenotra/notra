import { beforeEach, describe, expect, mock, test } from "bun:test";

import { postUpdatedAtMatches } from "../src/utils/post-patch-concurrency";

const existingUpdatedAt = new Date("2026-01-01T00:00:00.123Z");
const newerUpdatedAt = new Date("2026-01-01T00:00:00.456Z");

let storedUpdatedAt = existingUpdatedAt;
let capturedUpdateWhere: unknown;

const mockDb = {
  query: {
    posts: {
      findFirst: mock(async () => ({
        id: "post_test",
        title: "Fresh title",
        updatedAt: storedUpdatedAt,
      })),
    },
  },
  update: mock(() => ({
    set: mock(() => ({
      where: mock((where: unknown) => {
        capturedUpdateWhere = where;
        return {
          returning: mock(async () =>
            postUpdatedAtMatches(storedUpdatedAt, existingUpdatedAt)
              ? [
                  {
                    id: "post_test",
                    title: "Updated title",
                    slug: "fresh-title",
                    content: "<p>Updated</p>",
                    htmlUrl: null,
                    markdown: "# Updated",
                    recommendations: null,
                    contentType: "blog_post",
                    sourceMetadata: null,
                    status: "draft",
                    createdAt: existingUpdatedAt,
                    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
                  },
                ]
              : []
          ),
        };
      }),
    })),
  })),
};

const { commitPatchPost } = await import("../src/programs/posts");
const { runPostProgram } = await import("../src/utils/posts");

beforeEach(() => {
  storedUpdatedAt = existingUpdatedAt;
  capturedUpdateWhere = undefined;
  mockDb.query.posts.findFirst.mockClear();
  mockDb.update.mockClear();
});

describe("commitPatchPost", () => {
  test("sets updatedAt during commit and applies millisecond concurrency filter", async () => {
    const setMock = mock(() => ({
      where: mock((where: unknown) => {
        capturedUpdateWhere = where;
        return {
          returning: mock(async () => [
            {
              id: "post_test",
              title: "Updated title",
              slug: "fresh-title",
              content: "<p>Updated</p>",
              htmlUrl: null,
              markdown: "# Updated",
              recommendations: null,
              contentType: "blog_post",
              sourceMetadata: null,
              status: "draft",
              createdAt: existingUpdatedAt,
              updatedAt: new Date("2026-01-02T00:00:00.000Z"),
            },
          ]),
        };
      }),
    }));

    mockDb.update.mockImplementationOnce(() => ({
      set: setMock,
    }));

    const result = await runPostProgram(
      commitPatchPost({
        db: mockDb as never,
        organizationId: "org_test",
        postId: "post_test",
        prepared: {
          updateData: { title: "Updated title" },
          previousStatus: "draft",
          expectedUpdatedAt: existingUpdatedAt,
          rederiveTitleFromMarkdown: false,
        },
      })
    );

    expect(result._tag).toBe("Success");
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Updated title",
        updatedAt: expect.any(Date),
      })
    );
    expect(capturedUpdateWhere).toBeDefined();
  });

  test("returns concurrent modification when updatedAt changed after prepare", async () => {
    storedUpdatedAt = newerUpdatedAt;

    const result = await runPostProgram(
      commitPatchPost({
        db: mockDb as never,
        organizationId: "org_test",
        postId: "post_test",
        prepared: {
          updateData: { title: "Updated title" },
          previousStatus: "draft",
          expectedUpdatedAt: existingUpdatedAt,
          rederiveTitleFromMarkdown: false,
        },
      })
    );

    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      expect(result.failure._tag).toBe("PostConcurrentModificationError");
    }
  });
});
