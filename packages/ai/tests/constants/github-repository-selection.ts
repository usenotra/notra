import type {
  ExistingGitHubRepository,
  SaveGitHubRepositorySelectionParams,
} from "../../src/types/github-operations";

export const LEGACY_GITHUB_REPOSITORY = {
  id: "existing-integration",
  owner: "example",
  repo: "sdk",
  githubRepositoryId: null,
  githubAppInstallationId: null,
} satisfies ExistingGitHubRepository;

export const GITHUB_REPOSITORY_SELECTION = {
  organizationId: "organization",
  userId: "user",
  installationRecordIds: ["installation-a"],
  repositories: [
    {
      installationRecordId: "installation-a",
      repository: {
        id: "github-sdk",
        owner: "example",
        name: "sdk",
        fullName: "example/sdk",
        defaultBranch: "main",
        private: false,
        description: null,
      },
    },
  ],
} satisfies SaveGitHubRepositorySelectionParams;

export const MULTI_INSTALLATION_REPOSITORIES = [
  {
    ...LEGACY_GITHUB_REPOSITORY,
    id: "selected-a",
    githubRepositoryId: "github-sdk",
    githubAppInstallationId: "installation-a",
  },
  {
    id: "selected-b",
    owner: "another",
    repo: "docs",
    githubRepositoryId: "github-docs",
    githubAppInstallationId: "installation-b",
  },
  {
    id: "deselected-a",
    owner: "example",
    repo: "old-a",
    githubRepositoryId: "github-old-a",
    githubAppInstallationId: "installation-a",
  },
  {
    id: "deselected-b",
    owner: "another",
    repo: "old-b",
    githubRepositoryId: "github-old-b",
    githubAppInstallationId: "installation-b",
  },
  {
    id: "outside-selection",
    owner: "outside",
    repo: "untouched",
    githubRepositoryId: "github-outside",
    githubAppInstallationId: "installation-c",
  },
  {
    ...LEGACY_GITHUB_REPOSITORY,
    id: "pat-only",
    repo: "pat-only",
  },
] satisfies ExistingGitHubRepository[];
