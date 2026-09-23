import { describe, expect, test } from "bun:test";

import { recentPostsQueryInput } from "../src/utils/recent-posts-query";

describe("recent posts query input", () => {
  test("asks for three posts in the active project", () => {
    expect(recentPostsQueryInput("org-1", "project-1")).toEqual({
      organizationId: "org-1",
      projectId: "project-1",
      limit: 3,
    });
  });
});
