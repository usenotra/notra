import type { SiteServingState } from "@notra/sites-core/types/deployment";
import type { Site } from "@notra/sites-server/types/sites";
import {
  primaryMountUrl,
  siteAliasOrigin,
  sitePreviewOrigin,
} from "@notra/sites-server/urls";

import type {
  LiveDeployments,
  SiteDeploymentDbRow,
  SiteDomainDbRow,
} from "@/types/sites-server";

export function liveDeploymentsFromState(
  state: SiteServingState | null | undefined
): LiveDeployments {
  const live: LiveDeployments = new Map();
  if (state?.production) {
    live.set(state.production.deploymentId, state.production.activatedAt);
  }
  for (const pointer of Object.values(state?.previews ?? {})) {
    live.set(pointer.deploymentId, pointer.activatedAt);
  }
  return live;
}

export function serializeSite(
  site: Site,
  state: SiteServingState | null | undefined
) {
  return {
    id: site.id,
    name: site.name,
    slug: site.slug,
    status: site.status,
    suspendedReason: site.suspendedReason,
    repository:
      site.repositoryOwner && site.repositoryName
        ? { owner: site.repositoryOwner, name: site.repositoryName }
        : null,
    productionBranch: site.productionBranch,
    rootDirectory: site.rootDirectory,
    publicOrigin: site.publicOrigin,
    aliasOrigin: siteAliasOrigin(site.slug),
    liveUrl: primaryMountUrl(site.publicOrigin, site.mounts),
    mounts: site.mounts,
    previewsEnabled: site.previewsEnabled,
    previewVisibility: site.previewVisibility,
    previewPasswordSetAt: site.previewPassword?.updatedAt ?? null,
    publishMode: site.publishMode,
    showBranding: site.showBranding,
    liveDeploymentId: state?.production?.deploymentId ?? null,
    createdAt: site.createdAt,
  };
}

export function serializeDeployment(
  deployment: SiteDeploymentDbRow,
  live: LiveDeployments
) {
  return {
    id: deployment.id,
    kind: deployment.kind,
    previewKey: deployment.previewKey,
    trigger: deployment.trigger,
    status: deployment.status,
    live: live.has(deployment.id),
    liveSince: live.get(deployment.id) ?? null,
    generation: deployment.generation,
    branch: deployment.branch,
    commitSha: deployment.commitSha,
    commitMessage: deployment.commitMessage,
    commitAuthor: deployment.commitAuthor,
    pullRequestNumber: deployment.pullRequestNumber,
    url: primaryMountUrl(
      deployment.target.publicOrigin,
      deployment.target.mounts
    ),
    configHash: deployment.configHash,
    toolchainVersion: deployment.toolchainVersion,
    fileCount: deployment.fileCount,
    totalBytes: deployment.totalBytes,
    buildDurationMs: deployment.buildDurationMs,
    diagnostics: deployment.diagnostics,
    errorMessage: deployment.errorMessage,
    createdAt: deployment.createdAt,
    startedAt: deployment.startedAt,
    finishedAt: deployment.finishedAt,
  };
}

export function serializeDomain(site: Site, domain: SiteDomainDbRow) {
  return {
    id: domain.id,
    hostname: domain.hostname,
    kind: domain.kind,
    status: domain.status,
    records: domain.verificationRecords,
    lastError: domain.lastError,
    lastCheckedAt: domain.lastCheckedAt,
    verifiedAt: domain.verifiedAt,
    isPrimary: site.publicOrigin === `https://${domain.hostname}`,
  };
}

export function serializePreviews(
  site: Site,
  state: SiteServingState | null | undefined,
  deployments: SiteDeploymentDbRow[]
) {
  return Object.entries(state?.previews ?? {}).map(([previewKey, pointer]) => {
    const deployment = deployments.find(
      (candidate) => candidate.id === pointer.deploymentId
    );
    return {
      previewKey,
      deploymentId: pointer.deploymentId,
      visibility: pointer.visibility,
      activatedAt: pointer.activatedAt,
      url: primaryMountUrl(
        sitePreviewOrigin(site.slug, previewKey),
        site.mounts
      ),
      branch: deployment?.branch ?? null,
      pullRequestNumber: deployment?.pullRequestNumber ?? null,
      commitSha: deployment?.commitSha ?? null,
      commitMessage: deployment?.commitMessage ?? null,
    };
  });
}
