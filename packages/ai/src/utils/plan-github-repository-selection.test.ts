import { describe, expect, test } from "bun:test";

import {
  GITHUB_REPOSITORY_SELECTION,
  LEGACY_GITHUB_REPOSITORY,
  MULTI_INSTALLATION_REPOSITORIES,
} from "../../tests/constants/github-repository-selection";
import { GitHubRepositoryConflictError } from "../schemas/github-operations";
import { planGitHubRepositorySelection } from "./plan-github-repository-selection";

describe("GitHub repository migration planning", () => {
  test("reuses a PAT record's ID so its publishing outputs remain attached", () => {
    const existing = [
      { ...LEGACY_GITHUB_REPOSITORY, owner: "EXAMPLE", repo: "SDK" },
    ];
    const before = structuredClone(existing);

    const plan = planGitHubRepositorySelection(
      existing,
      GITHUB_REPOSITORY_SELECTION
    );

    expect(plan.selections).toHaveLength(1);
    expect(plan.selections[0]).toMatchObject({
      integrationId: "existing-integration",
      installationRecordId: "installation-a",
      repository: { id: "github-sdk" },
    });
    expect(plan.deselectedIds).toEqual([]);
    expect(existing).toEqual(before);
  });

  test("preserves identity when a renamed repository moves from a previous installation", () => {
    const plan = planGitHubRepositorySelection(
      [
        {
          ...LEGACY_GITHUB_REPOSITORY,
          owner: "previous-owner",
          repo: "previous-name",
          githubRepositoryId: "github-sdk",
          githubAppInstallationId: "previous-installation",
        },
      ],
      GITHUB_REPOSITORY_SELECTION
    );

    expect(plan.selections[0]?.integrationId).toBe("existing-integration");
    expect(plan.selections[0]?.installationRecordId).toBe("installation-a");
    expect(plan.deselectedIds).toEqual([]);
  });

  test("accepts ID and name matches that identify the same integration", () => {
    const plan = planGitHubRepositorySelection(
      [
        {
          ...LEGACY_GITHUB_REPOSITORY,
          githubRepositoryId: "github-sdk",
          githubAppInstallationId: "installation-a",
        },
      ],
      GITHUB_REPOSITORY_SELECTION
    );

    expect(plan.selections[0]?.integrationId).toBe("existing-integration");
    expect(plan.deselectedIds).toEqual([]);
  });

  test("rejects a reused repository name bound to a different GitHub identity", () => {
    expect(() =>
      planGitHubRepositorySelection(
        [
          {
            ...LEGACY_GITHUB_REPOSITORY,
            githubRepositoryId: "different-github-id",
          },
        ],
        GITHUB_REPOSITORY_SELECTION
      )
    ).toThrow(GitHubRepositoryConflictError);
  });

  test("rejects split matches instead of choosing between two sets of publishing settings", () => {
    expect(() =>
      planGitHubRepositorySelection(
        [
          {
            ...LEGACY_GITHUB_REPOSITORY,
            id: "id-match",
            repo: "old-name",
            githubRepositoryId: "github-sdk",
          },
          { ...LEGACY_GITHUB_REPOSITORY, id: "name-match" },
        ],
        GITHUB_REPOSITORY_SELECTION
      )
    ).toThrow(GitHubRepositoryConflictError);
  });

  test("plans a new integration only when neither its ID nor its name is connected", () => {
    const plan = planGitHubRepositorySelection(
      [{ ...LEGACY_GITHUB_REPOSITORY, repo: "unrelated" }],
      GITHUB_REPOSITORY_SELECTION
    );

    expect(plan.selections).toHaveLength(1);
    expect(plan.selections[0]?.integrationId).toBeUndefined();
    expect(plan.selections[0]?.repository.id).toBe("github-sdk");
    expect(plan.deselectedIds).toEqual([]);
  });

  test("deselects omitted repositories across scoped installations without touching PAT or other installations", () => {
    const plan = planGitHubRepositorySelection(
      MULTI_INSTALLATION_REPOSITORIES,
      {
        ...GITHUB_REPOSITORY_SELECTION,
        installationRecordIds: ["installation-a", "installation-b"],
        repositories: [
          ...GITHUB_REPOSITORY_SELECTION.repositories,
          {
            installationRecordId: "installation-b",
            repository: {
              id: "github-docs",
              owner: "another",
              name: "docs",
              fullName: "another/docs",
              defaultBranch: "main",
              private: true,
              description: null,
            },
          },
        ],
      }
    );

    expect(plan.selections.map(({ integrationId }) => integrationId)).toEqual([
      "selected-a",
      "selected-b",
    ]);
    expect(plan.deselectedIds).toEqual(["deselected-a", "deselected-b"]);
  });

  test("empty selection disables all scoped App repositories and preserves unrelated connections", () => {
    const plan = planGitHubRepositorySelection(
      MULTI_INSTALLATION_REPOSITORIES,
      {
        ...GITHUB_REPOSITORY_SELECTION,
        installationRecordIds: ["installation-a", "installation-b"],
        repositories: [],
      }
    );

    expect(plan.selections).toEqual([]);
    expect(plan.deselectedIds).toEqual([
      "selected-a",
      "selected-b",
      "deselected-a",
      "deselected-b",
    ]);
  });
});
