import type { SiteDeployment, SiteDetail, SitePreviewRow } from "@/types/sites";
import { isDeploymentInProgress } from "@/utils/site-deployments";

/** The newest deployment per preview key; the list arrives newest first. */
function latestPreviewDeployments(
  deployments: readonly SiteDeployment[]
): Map<string, SiteDeployment> {
  const latest = new Map<string, SiteDeployment>();
  for (const deployment of deployments) {
    const key = deployment.previewKey;
    if (deployment.kind === "preview" && key && !latest.has(key)) {
      latest.set(key, deployment);
    }
  }
  return latest;
}

/**
 * Open previews plus previews whose first build is still running. A served
 * preview shows the status of a newer build while that one runs or failed.
 */
export function sitePreviewRows(detail: SiteDetail): SitePreviewRow[] {
  const latest = latestPreviewDeployments(detail.deployments);

  const served: SitePreviewRow[] = detail.previews.map((preview) => {
    const newest = latest.get(preview.previewKey);
    const newerBuild =
      newest &&
      newest.id !== preview.deploymentId &&
      (isDeploymentInProgress(newest.status) || newest.status === "failed")
        ? newest
        : null;
    return {
      ...preview,
      served: true,
      status: newerBuild?.status ?? "ready",
      latestDeploymentId: newerBuild?.id ?? preview.deploymentId,
      updatedAt: preview.activatedAt,
    };
  });
  served.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const servedKeys = new Set(
    detail.previews.map((preview) => preview.previewKey)
  );
  const pending: SitePreviewRow[] = [];
  for (const [previewKey, deployment] of latest) {
    if (
      servedKeys.has(previewKey) ||
      !isDeploymentInProgress(deployment.status)
    ) {
      continue;
    }
    pending.push({
      previewKey,
      deploymentId: deployment.id,
      visibility: null,
      activatedAt: null,
      url: deployment.url,
      branch: deployment.branch,
      pullRequestNumber: deployment.pullRequestNumber,
      commitSha: deployment.commitSha,
      commitMessage: deployment.commitMessage,
      served: false,
      status: deployment.status,
      latestDeploymentId: deployment.id,
      updatedAt: deployment.createdAt,
    });
  }

  return [...pending, ...served];
}
