export const repositoryData = {
  branches: ["main", "release", "feature/docs"],
  defaultBranch: "main",
  configDirectories: ["", "docs"],
  contentCounts: {},
};

export const releaseData = {
  ...repositoryData,
  configDirectories: ["release-docs"],
};
