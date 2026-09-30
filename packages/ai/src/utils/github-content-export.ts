import { createHmac, timingSafeEqual } from "node:crypto";

import { GITHUB_CONTENT_POST_TRAILER } from "@notra/ai/constants/github";
import type { GitHubContentExport } from "@notra/ai/types/github-content-export";
import { decodeIntegrationEncryptionKey } from "@notra/db/utils/integration-encryption";

export function createGitHubContentExportMarker(snapshot: GitHubContentExport) {
  const signature = createHmac(
    "sha256",
    decodeIntegrationEncryptionKey(process.env.INTEGRATION_ENCRYPTION_KEY)
  )
    .update(
      JSON.stringify([
        "notra:content-export:v1",
        snapshot.organizationId,
        snapshot.postId,
        snapshot.owner.toLowerCase(),
        snapshot.repo.toLowerCase(),
        snapshot.path,
        snapshot.parentSha,
        snapshot.markdown,
      ])
    )
    .digest("hex");
  return `${GITHUB_CONTENT_POST_TRAILER}${snapshot.organizationId}/${snapshot.postId} ${signature}`;
}

export function isGitHubContentExport(
  message: string,
  snapshot: GitHubContentExport
) {
  const marker = message
    .split(/\r?\n/)
    .find((line) => line.startsWith(GITHUB_CONTENT_POST_TRAILER));
  if (!marker) {
    return false;
  }
  const expected = Buffer.from(createGitHubContentExportMarker(snapshot));
  const actual = Buffer.from(marker);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
