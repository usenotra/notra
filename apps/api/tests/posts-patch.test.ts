import { beforeEach, describe, expect, mock, test } from "bun:test";

const existingUpdatedAt = new Date("2026-01-01T00:00:00.000Z");
const staleUpdatedAt = new Date("2026-01-01T00:00:01.000Z");

let currentUpdatedAt = existingUpdatedAt;

const mockDb = {
  query: {
    posts: {
      findFirst: mock(async ({ where }: { where: unknown }) => {
        void where;
        return {
          id: "post_test",
          title: "Fresh title",
          slug: "fresh-title",
          contentType: "blog_post",
          status: "draft",
          updatedAt: currentUpdatedAt,
        };
      }),
    },
  },
  update: mock(() => ({
    set: mock(() => ({
      where: mock(() => ({
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
      })),
    })),
  })),
};

const { commitPatchPost } = await import("../src/programs/posts");
const { runPostProgram } = await import("../src/utils/posts");

beforeEach(() => {
  currentUpdatedAt = existingUpdatedAt;
  mockDb.query.posts.findFirst.mockClear();
  mockDb.update.mockClear();
});

describe("commitPatchPost", () => {
  test("sets updatedAt during commit instead of prepare", async () => {
    const setMock = mock(() => ({
      where: mock(() => ({
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
      })),
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
    expect(setMock.mock.calls[0]?.[0].updatedAt.getTime()).toBeGreaterThan(
      existingUpdatedAt.getTime()
    );
  });

  test("returns concurrent modification when the post changed during rate limiting", async () => {
    currentUpdatedAt = staleUpdatedAt;

    mockDb.query.posts.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "post_test" });

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
