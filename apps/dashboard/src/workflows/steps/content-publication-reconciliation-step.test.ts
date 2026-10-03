import { expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.env.NOTRA_RECONCILIATION_STEP_TEST !== "1") {
  test("stale publication reconciliation stops before GitHub", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_RECONCILIATION_STEP_TEST: "1" },
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  const getToken = mock(async () => {
    throw new Error("GitHub should not be called");
  });

  mock.module("@notra/ai/integrations/github", () => ({
    getTokenForIntegrationId: getToken,
  }));
  mock.module("@notra/ai/utils/content-publication", () => ({
    reconcileContentPublication: async () => null,
    closeContentPublicationForPullRequest: async () => undefined,
  }));
  mock.module("@notra/ai/utils/octokit", () => ({
    createOctokit: () => {
      throw new Error("Octokit should not be created");
    },
  }));

  const { reconcileContentPublicationStep } =
    await import("./content-publication-reconciliation-step");

  test("a stale reconciliation performs no GitHub work", async () => {
    await reconcileContentPublicationStep(
      {
        organizationId: "org_1",
        repositoryId: "repo_1",
        owner: "acme",
        repo: "docs",
        pullRequestNumber: 7,
      } as never,
      "2026-09-21T08:00:00.000Z"
    );
    expect(getToken).not.toHaveBeenCalled();
  });
}
