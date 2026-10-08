import type { SitePreviewRow } from "../../src/types/sites";

export const preview: SitePreviewRow = {
  previewKey: "branch-feature",
  deploymentId: "served-old",
  latestDeploymentId: "new-build",
  visibility: "protected",
  activatedAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  url: "https://preview.example/blog",
  branch: "feature",
  pullRequestNumber: null,
  commitSha: "abc1234",
  commitMessage: "Preview changes",
  served: true,
  status: "building",
};
