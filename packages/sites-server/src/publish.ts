import {
  SITE_BUILD_LIMITS,
  SITE_R2_KEYS,
} from "@notra/sites-core/constants/sites";
import type {
  SiteManifest,
  SiteManifestFile,
} from "@notra/sites-core/types/deployment";
import { sha256Hex } from "@notra/sites-core/utils/hash";

import { UPLOAD_CONCURRENCY } from "./constants/build";
import { JSON_CONTENT_TYPE } from "./constants/content-types";
import { r2Put } from "./r2";
import { readTarGz } from "./tar";
import type { PublishDeploymentFilesParams } from "./types/deployments";
import { mapWithConcurrency } from "./utils/concurrency";
import { contentTypeForPath } from "./utils/content-types";

export async function publishDeploymentFiles(
  params: PublishDeploymentFilesParams
): Promise<SiteManifest> {
  const { site, deployment } = params;
  const files = readTarGz(params.archive, {
    maxFiles: SITE_BUILD_LIMITS.maxOutputFiles,
    maxBytes: SITE_BUILD_LIMITS.maxOutputBytes,
    maxFileBytes: SITE_BUILD_LIMITS.maxSingleFileBytes,
  });
  if (files.length === 0) {
    throw new Error("The build produced no files");
  }
  const manifestFiles = await mapWithConcurrency(
    files,
    UPLOAD_CONCURRENCY,
    async (file): Promise<SiteManifestFile> => {
      const path = `/${file.path}`;
      const contentType = contentTypeForPath(path);
      await r2Put(SITE_R2_KEYS.file(site.id, deployment.id, path), file.data, {
        contentType,
      });
      return {
        path,
        size: file.data.byteLength,
        sha256: await sha256Hex(file.data),
        contentType,
      };
    }
  );
  const manifest: SiteManifest = {
    version: 1,
    siteId: site.id,
    deploymentId: deployment.id,
    commitSha: deployment.commitSha,
    toolchainVersion: params.toolchainVersion ?? "unknown",
    target: deployment.target,
    configHash: deployment.configHash,
    createdAt: new Date().toISOString(),
    totalBytes: manifestFiles.reduce((sum, file) => sum + file.size, 0),
    files: manifestFiles.sort((a, b) => a.path.localeCompare(b.path)),
    redirects: params.result.redirects.map((rule) => ({
      source: rule.source,
      destination: rule.destination,
      status: rule.permanent ? 308 : 307,
    })),
    contentSecurityPolicy: params.result.contentSecurityPolicy ?? undefined,
  };
  await r2Put(
    SITE_R2_KEYS.manifest(site.id, deployment.id),
    JSON.stringify(manifest),
    { contentType: JSON_CONTENT_TYPE }
  );
  return manifest;
}
