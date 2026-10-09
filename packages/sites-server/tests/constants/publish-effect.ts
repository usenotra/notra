import type { PublishDeploymentFilesParams } from "../../src/types/deployments";

export const publishFixture = {
  site: { id: "site-publish" },
  deployment: {
    id: "deployment-publish",
    commitSha: "a".repeat(40),
    configHash: "config-hash",
    target: {
      publicOrigin: "https://example.com",
      mounts: { blog: "/" },
      noindex: false,
      branding: true,
    },
  },
  result: {
    ok: true,
    diagnostics: [],
    areas: [],
    fileCount: 2,
    totalBytes: 2,
    redirects: [],
    contentSecurityPolicy: null,
  },
  toolchainVersion: "synthetic-toolchain",
} satisfies Omit<PublishDeploymentFilesParams, "archive">;
