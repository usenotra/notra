import {
  SITE_BUILD_LIMITS,
  SITE_R2_KEYS,
} from "@notra/sites-core/constants/sites";
import type {
  SiteManifest,
  SiteManifestFile,
} from "@notra/sites-core/types/deployment";
import { sha256Hex } from "@notra/sites-core/utils/hash";
import { Clock, Effect } from "effect";

import { UPLOAD_CONCURRENCY } from "./constants/build";
import { JSON_CONTENT_TYPE } from "./constants/content-types";
import { r2PutEffect } from "./r2";
import { readTarGz } from "./tar";
import type { PublishDeploymentFilesParams } from "./types/deployments";
import { mapWithConcurrencyEffect } from "./utils/concurrency";
import { contentTypeForPath } from "./utils/content-types";
import { runSitesEffect } from "./utils/run-sites-effect";

export const publishDeploymentFilesEffect = Effect.fn(
  "Sites.publishDeploymentFiles"
)(function* (params: PublishDeploymentFilesParams) {
  const { site, deployment } = params;
  const files = readTarGz(params.archive, {
    maxFiles: SITE_BUILD_LIMITS.maxOutputFiles,
    maxBytes: SITE_BUILD_LIMITS.maxOutputBytes,
    maxFileBytes: SITE_BUILD_LIMITS.maxSingleFileBytes,
  });
  if (files.length === 0) {
    return yield* Effect.fail(new Error("The build produced no files"));
  }
  const manifestFiles = yield* mapWithConcurrencyEffect(
    files,
    UPLOAD_CONCURRENCY,
    (file) =>
      Effect.gen(function* () {
        const path = `/${file.path}`;
        const contentType = contentTypeForPath(path);
        yield* r2PutEffect(
          SITE_R2_KEYS.file(site.id, deployment.id, path),
          file.data,
          {
            contentType,
          }
        );
        return {
          path,
          size: file.data.byteLength,
          sha256: yield* Effect.tryPromise({
            try: () => sha256Hex(file.data),
            catch: (error) => error,
          }),
          contentType,
        } satisfies SiteManifestFile;
      })
  );
  const createdAt = yield* Clock.currentTimeMillis;
  const manifest: SiteManifest = {
    version: 1,
    siteId: site.id,
    deploymentId: deployment.id,
    commitSha: deployment.commitSha,
    toolchainVersion: params.toolchainVersion ?? "unknown",
    target: deployment.target,
    configHash: deployment.configHash,
    createdAt: new Date(createdAt).toISOString(),
    totalBytes: manifestFiles.reduce((sum, file) => sum + file.size, 0),
    files: manifestFiles.sort((a, b) => a.path.localeCompare(b.path)),
    redirects: params.result.redirects.map((rule) => ({
      source: rule.source,
      destination: rule.destination,
      status: rule.permanent ? 308 : 307,
    })),
    contentSecurityPolicy: params.result.contentSecurityPolicy ?? undefined,
  };
  yield* r2PutEffect(
    SITE_R2_KEYS.manifest(site.id, deployment.id),
    JSON.stringify(manifest),
    { contentType: JSON_CONTENT_TYPE }
  );
  return manifest;
});

export function publishDeploymentFiles(
  params: PublishDeploymentFilesParams
): Promise<SiteManifest> {
  return runSitesEffect(publishDeploymentFilesEffect(params));
}
