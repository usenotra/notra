import { expect, mock, test } from "bun:test";

mock.module("@notra/db/drizzle", () => ({
  db: { query: { posts: { findFirst: async () => null } } },
}));

const { buildGitHubMentionTools } =
  await import("@notra/ai/tools/github-mention");

test("mention tools can load organization skills on write and reply-only runs", () => {
  for (const mode of ["same_pull_request", "reply_only"] as const) {
    const tools = buildGitHubMentionTools({
      octokit: {} as never,
      context: {
        organizationId: "org-1",
        destination: { mode },
      } as never,
      state: { permissionDenied: false } as never,
    });
    expect(tools).toHaveProperty("listAvailableSkills");
    expect(tools).toHaveProperty("getSkillByName");
    expect(tools).not.toHaveProperty("createSkill");
  }
});
