import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";

import { Octokit } from "@octokit/core";
import { Effect } from "effect";
import type { Emulator } from "emulate";

import type { IrisPollRepository } from "../src/types/autonomy-poll";
import { startGithubEmulator } from "./utils/github-emulator";

let github: Emulator;
let client: Octokit;
let repositories: IrisPollRepository[] = [];
const token = mock(
  async (_id: string): Promise<string | null> => "notra_test_token"
);
// Repository discovery and secret storage are host boundaries. All GitHub
// reads use real HTTP, Octokit, and the state seeded through Emulate's API.
mock.module("@notra/db/drizzle", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ orderBy: () => ({ limit: async () => repositories }) }),
      }),
    }),
  },
}));
mock.module("@notra/ai/integrations/github", () => ({
  getTokenForIntegrationId: token,
  // mock.module replaces the whole module process-wide: other test files
  // importing this specifier (e.g. via repo-image or integrations-cache)
  // must still find every export they use, or their module load throws.
  getGitHubCloneToken: token,
  getGitHubCloneTokenForOrganization: token,
  getGitHubIntegrationById: async () => null,
  getGitHubIntegrationsByOrganization: async () => [],
  getGitHubToolRepositoryContextByIntegrationId: async () => null,
  validateRepositoryBranchExists: async () => true,
}));
mock.module("@notra/ai/utils/octokit", () => ({
  createOctokit: (auth?: string) => new Octokit({ auth, baseUrl: github.url }),
}));
const { pollGithubSource } = await import("../src/utils/iris-poll-github");
const poll = (since = new Date("2000-01-01T00:00:00Z")) =>
  Effect.runPromise(pollGithubSource({ organizationId: "org-test", since }));

beforeAll(async () => {
  github = await startGithubEmulator();
  client = new Octokit({ auth: "notra_test_token", baseUrl: github.url });
}, 30_000);
afterAll(async () => {
  await github?.close();
});
beforeEach(() => {
  github.reset();
  repositories = [
    {
      id: "integration-test",
      owner: "notra-test",
      repo: "product",
      defaultBranch: "main",
    },
  ];
  token.mockReset();
  token.mockImplementation(async () => "notra_test_token");
});

describe("scheduled GitHub activity polling against Vercel Labs Emulate", () => {
  test("turns a published release and commits into content signals with stable deduplication keys", async () => {
    const release = await client.request(
      "POST /repos/{owner}/{repo}/releases",
      {
        owner: "notra-test",
        repo: "product",
        tag_name: "v1.0.0",
        name: "Scan scheduling",
        body: "Reliable recurring scans",
      }
    );
    const first = await poll();
    expect(first.skippedReason).toBeNull();
    expect(first.items).toHaveLength(2);
    const releaseSignal = first.items.find((item) =>
      item.title.includes("v1.0.0")
    );
    expect(releaseSignal?.payload).toMatchObject({
      repositoryId: "integration-test",
      discoveredBy: "poll",
      data: {
        tagName: "v1.0.0",
        body: "Reliable recurring scans",
        url: release.data.html_url,
      },
    });
    const push = first.items.find((item) => item.title.includes("commits on"));
    expect(push?.payload).toMatchObject({
      repositoryId: "integration-test",
      data: { branch: "main" },
    });
    expect(push?.occurredAt).toBeInstanceOf(Date);
    expect(new Set(first.items.map((item) => item.dedupeHash)).size).toBe(2);
    expect((await poll()).items.map((item) => item.dedupeHash)).toEqual(
      first.items.map((item) => item.dedupeHash)
    );
  });

  test("ignores draft and prerelease announcements", async () => {
    for (const release of [
      { tag_name: "v-draft", draft: true },
      { tag_name: "v-preview", prerelease: true },
      { tag_name: "v-stable" },
    ]) {
      await client.request("POST /repos/{owner}/{repo}/releases", {
        owner: "notra-test",
        repo: "product",
        ...release,
      });
    }
    const result = await poll();
    expect(
      result.items
        .filter((item) => item.title.startsWith("Release "))
        .map((item) => item.title)
    ).toEqual(["Release v-stable in notra-test/product"]);
  });

  test("respects the lookback window for releases and commits", async () => {
    await client.request("POST /repos/{owner}/{repo}/releases", {
      owner: "notra-test",
      repo: "product",
      tag_name: "v-old",
    });
    expect((await poll(new Date(Date.now() + 86_400_000))).items).toEqual([]);
  });

  test("a deleted repository does not prevent polling a healthy repository", async () => {
    repositories.unshift({
      id: "deleted",
      owner: "notra-test",
      repo: "missing",
      defaultBranch: "main",
    });
    const result = await poll();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.payload.repositoryId).toBe("integration-test");
    expect(token).toHaveBeenCalledTimes(2);
  });

  test("missing credentials skip only their repository", async () => {
    repositories.unshift({
      id: "no-token",
      owner: "notra-test",
      repo: "private",
      defaultBranch: "main",
    });
    token.mockImplementation(async (id) =>
      id === "no-token" ? null : "notra_test_token"
    );
    const result = await poll();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.payload.repositoryId).toBe("integration-test");
  });

  test("an empty integration list skips without resolving credentials", async () => {
    repositories = [];
    expect(await poll()).toMatchObject({
      items: [],
      skippedReason: "No enabled GitHub repositories are connected",
    });
    expect(token).not.toHaveBeenCalled();
  });

  test("deduplication stays scoped to the connected repository", async () => {
    repositories.push({
      id: "another-integration",
      owner: "notra-test",
      repo: "product",
      defaultBranch: "main",
    });
    const result = await poll();
    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.dedupeHash).not.toBe(result.items[1]?.dedupeHash);
  });
});
