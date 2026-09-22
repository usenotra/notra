import { afterAll, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const databaseUrl = process.env.DATABASE_URL ?? "";
const isLocalPostgres =
  databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");

if (process.env.NOTRA_LOCAL_MENTION_DB_TEST !== "1") {
  test("local mention skills and PR-head sync against postgres", () => {
    if (!isLocalPostgres) {
      return;
    }
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_LOCAL_MENTION_DB_TEST: "1" },
      }
    );
    expect(
      result.status,
      `${result.stdout?.toString()}${result.stderr?.toString()}`
    ).toBe(0);
  });
} else {
  const { listSkillSummaries } =
    await import("@notra/ai/skills/functions/service");
  const { getGitHubMentionInstructions } =
    await import("@notra/ai/prompts/github-mention");
  const {
    closeContentPublicationForPullRequest,
    findContentPublicationForPullRequest,
    findOpenContentPublicationByPullRequest,
  } = await import("@notra/ai/utils/content-publication");
  const { syncPublishedPostFromPullRequestHead } =
    await import("@notra/ai/utils/update-published-content");
  const { db } = await import("@notra/db/drizzle");
  const {
    contentPublications,
    githubAppInstallations,
    githubIntegrations,
    organizations,
    postCollections,
    posts,
    skills,
    users,
  } = await import("@notra/db/schema");
  const { eq } = await import("drizzle-orm");
  type GitHubMentionOctokit =
    import("@notra/ai/types/github-mention").GitHubMentionOctokit;

  const ids = {
    org: "localtest_org_mention",
    user: "localtest_user_mention",
    integration: "localtest_int_mention",
    collection: "localtest_col_mention",
    post: "localtest_post_mention",
    publication: "localtest_pub_mention",
    skill: "localtest_skill_mention",
    blankSkill: "localtest_skill_blank",
    installation: "localtest_ghai_mention",
  };

  await db.delete(organizations).where(eq(organizations.id, ids.org));
  await db.delete(users).where(eq(users.id, ids.user));
  const now = new Date();
  await db.insert(organizations).values({
    id: ids.org,
    name: "Local Mention Org",
    slug: "localtest-mention",
    createdAt: now,
  });
  await db.insert(users).values({
    id: ids.user,
    name: "Local Tester",
    email: "localtest-mention@usenotra.com",
  });
  await db.insert(githubAppInstallations).values({
    id: ids.installation,
    organizationId: ids.org,
    createdByUserId: ids.user,
    installationId: "55",
    accountId: "1",
    accountLogin: "acme",
    accountAvatarUrl: "https://example.com/acme.png",
    accountType: "Organization",
    enabled: true,
  });
  await db.insert(githubIntegrations).values({
    id: ids.integration,
    organizationId: ids.org,
    createdByUserId: ids.user,
    displayName: "acme/app",
    owner: "Acme",
    repo: "App",
    defaultBranch: "main",
    githubRepositoryId: "99",
    githubAppInstallationId: ids.installation,
  });
  await db.insert(postCollections).values({
    id: ids.collection,
    organizationId: ids.org,
    source: "manual",
    name: "Local collection",
  });
  await db.insert(posts).values({
    id: ids.post,
    organizationId: ids.org,
    collectionId: ids.collection,
    title: "Release",
    content: "<p>Old intro</p>",
    markdown:
      "# Release\n\n![Chart](https://cdn.notra.dev/a.png)\n\nOld intro.",
    contentType: "blog_post",
    status: "published",
  });
  await db.insert(contentPublications).values({
    id: ids.publication,
    organizationId: ids.org,
    postId: ids.post,
    repositoryId: ids.integration,
    owner: "Acme",
    repo: "App",
    path: "docs/release.md",
    branch: "notra/changelog",
    pullRequestNumber: 42,
    pullRequestUrl: "https://github.com/acme/app/pull/42",
    headSha: "abc",
    status: "open",
  });
  await db.insert(skills).values([
    {
      id: ids.skill,
      organizationId: ids.org,
      name: "blog-post",
      description: "House blog format",
      content: "Lead with the outcome. Keep the voice.",
    },
    {
      id: ids.blankSkill,
      organizationId: ids.org,
      name: "draft",
      description: "   ",
      content: "Should not appear in the catalog.",
    },
  ]);

  afterAll(async () => {
    await db.delete(organizations).where(eq(organizations.id, ids.org));
    await db.delete(users).where(eq(users.id, ids.user));
  });

  test("finds the open publication from a mixed-case GitHub webhook owner/repo", async () => {
    const publication = await findOpenContentPublicationByPullRequest({
      owner: "acme",
      repo: "app",
      pullRequestNumber: 42,
      installationId: "55",
      githubRepositoryId: "99",
    });
    expect(publication?.id).toBe(ids.publication);
    expect(publication?.organizationId).toBe(ids.org);
    expect(publication?.markdown).toContain("Old intro");
    expect(
      await findOpenContentPublicationByPullRequest({
        owner: "acme",
        repo: "app",
        pullRequestNumber: 42,
        installationId: "999",
        githubRepositoryId: "99",
      })
    ).toBeNull();
  });

  test("mention lookup matches GitHub's case-insensitive owner/repo", async () => {
    const publication = await findContentPublicationForPullRequest({
      organizationId: ids.org,
      owner: "acme",
      repo: "app",
      pullRequestNumber: 42,
    });
    expect(publication?.id).toBe(ids.publication);
  });

  test("copies an applied suggestion from the PR head into the Notra post", async () => {
    const fileOnHead =
      "# Release\n\n![Chart](../images/release/a.png)\n\nApplied suggestion.";
    const octokit = {
      request: async (route: string, args: { ref?: string }) => {
        if (String(route).includes("/contents/")) {
          const contents =
            args.ref === "abc"
              ? "# Release\n\n![Chart](../images/release/a.png)\n\nOld intro."
              : fileOnHead;
          return {
            data: {
              type: "file",
              content: Buffer.from(contents).toString("base64"),
            },
          };
        }
        return { data: { status: "ahead" } };
      },
    } as unknown as GitHubMentionOctokit;

    const publication = await findOpenContentPublicationByPullRequest({
      owner: "ACME",
      repo: "APP",
      pullRequestNumber: 42,
      installationId: "55",
      githubRepositoryId: "99",
    });
    if (!publication) {
      throw new Error("missing publication");
    }
    const result = await syncPublishedPostFromPullRequestHead({
      octokit,
      organizationId: ids.org,
      publication,
      commitSha: "applied",
      branch: "notra/changelog",
    });
    expect(result).toMatchObject({ status: "synchronized" });
    if (result && result.status === "synchronized") {
      expect(result.markdown).toContain("https://cdn.notra.dev/a.png");
      expect(result.markdown).toContain("Applied suggestion.");
    }

    const post = await db.query.posts.findFirst({
      where: eq(posts.id, ids.post),
    });
    expect(post?.markdown).toContain("Applied suggestion.");
    expect(post?.markdown).toContain("https://cdn.notra.dev/a.png");
    expect(post?.markdown).not.toContain("../images/release/a.png");

    const updated = await db.query.contentPublications.findFirst({
      where: eq(contentPublications.id, ids.publication),
    });
    expect(updated?.headSha).toBe("applied");
  });

  test("loads org skills into mention instructions and skips blank descriptions", async () => {
    const summaries = await listSkillSummaries({ organizationId: ids.org });
    expect(summaries).toEqual([
      { name: "blog-post", description: "House blog format" },
    ]);
    const instructions = getGitHubMentionInstructions({
      skillSummaries: summaries,
      contentType: "blog_post",
    });
    expect(instructions).toContain("<available_skills>");
    expect(instructions).toContain("blog-post: House blog format");
    expect(instructions).not.toContain("draft:");
  });

  test("marks the publication merged when the pull request closes", async () => {
    const updated = await closeContentPublicationForPullRequest({
      owner: "acme",
      repo: "app",
      pullRequestNumber: 42,
      merged: true,
    });
    expect(updated).toBe(1);
    expect(
      await findOpenContentPublicationByPullRequest({
        owner: "acme",
        repo: "app",
        pullRequestNumber: 42,
        installationId: "55",
        githubRepositoryId: "99",
      })
    ).toBeNull();
  });
}
