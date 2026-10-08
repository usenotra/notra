import { db } from "@notra/db/drizzle";
import { organizations, siteDeployments, sites } from "@notra/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

import {
  CHECK_RUN_ANNOTATION_MAX_LENGTH,
  CHECK_RUN_NAME,
  CHECK_RUN_SUMMARY_MAX_LENGTH,
} from "./constants/github";
import {
  completeCheckRun,
  createCheckRun,
  siteRepositoryAccess,
  upsertPreviewComment,
} from "./github";
import type { DeploymentOutcome, SiteDeployment } from "./types/deployments";
import type { CheckReport } from "./types/reporting";
import type { Site } from "./types/sites";
import { errorMessage } from "./utils/errors";
import { previewCommentBody } from "./utils/preview-comment";
import { deploymentDashboardUrl, primaryMountUrl } from "./utils/urls";

async function safely<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    console.warn(`sites.${label}_failed`, errorMessage(error));
    return null;
  }
}

async function dashboardUrl(
  site: Site,
  deployment: SiteDeployment
): Promise<string> {
  const [organization] = await db
    .select({ slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, site.organizationId))
    .limit(1);
  return deploymentDashboardUrl({
    organizationSlug: organization?.slug ?? site.organizationId,
    siteId: site.id,
    deploymentId: deployment.id,
  });
}

export async function openCheckRun(
  site: Site,
  deployment: SiteDeployment
): Promise<SiteDeployment> {
  await reportPreviewComment(site, deployment);
  if (deployment.checkRunId) {
    return deployment;
  }
  const checkRunId = await safely("check_create", async () => {
    const { repository, token } = await siteRepositoryAccess(site, {
      checks: "write",
    });
    return await createCheckRun(repository, token, {
      name:
        deployment.kind === "production"
          ? CHECK_RUN_NAME
          : `${CHECK_RUN_NAME} preview`,
      headSha: deployment.commitSha,
      detailsUrl: await dashboardUrl(site, deployment),
      externalId: deployment.id,
      title: "Building",
      summary: `Building ${deployment.kind === "production" ? "the live site" : "a preview"} from ${deployment.commitSha.slice(0, 7)}.`,
    });
  });
  if (!checkRunId) {
    return deployment;
  }
  await db
    .update(siteDeployments)
    .set({ checkRunId })
    .where(eq(siteDeployments.id, deployment.id));
  return { ...deployment, checkRunId };
}

function checkFor(
  deployment: SiteDeployment,
  outcome: DeploymentOutcome
): CheckReport {
  switch (outcome.kind) {
    case "live": {
      const url = primaryMountUrl(
        deployment.target.publicOrigin,
        deployment.target.mounts
      );
      const isProduction = deployment.kind === "production";
      return {
        conclusion: "success",
        title: isProduction ? "Live" : "Preview ready",
        summary: `${isProduction ? "Published" : "Preview"}: ${url}\n\n${deployment.fileCount ?? 0} files, built in ${Math.round((deployment.buildDurationMs ?? 0) / 1000)} s.`,
        liveUrl: url,
      };
    }
    case "not_live":
      return {
        conclusion: "neutral",
        title: "Superseded by a newer commit",
        summary:
          "A newer deployment was already live, so this build was not published.",
        liveUrl: null,
      };
    case "skipped":
      return {
        conclusion: "skipped",
        title: "Skipped",
        summary: outcome.reason,
        liveUrl: null,
      };
    case "failed":
      return {
        conclusion: "failure",
        title: "Build failed",
        summary: outcome.summary,
        liveUrl: null,
      };
    default: {
      const unhandled: never = outcome;
      throw new Error(
        `Unhandled deployment outcome ${JSON.stringify(unhandled)}`
      );
    }
  }
}

export async function reportOutcome(
  site: Site,
  deployment: SiteDeployment,
  outcome: DeploymentOutcome
): Promise<void> {
  await reportPreviewComment(site, deployment, outcome);
  const checkRunId = deployment.checkRunId;
  if (!checkRunId) {
    return;
  }
  const check = checkFor(deployment, outcome);
  await safely("check_complete", async () => {
    const { repository, token } = await siteRepositoryAccess(site, {
      checks: "write",
    });
    await completeCheckRun(repository, token, {
      checkRunId,
      conclusion: check.conclusion,
      title: check.title,
      summary: check.summary.slice(0, CHECK_RUN_SUMMARY_MAX_LENGTH),
      detailsUrl: check.liveUrl ?? (await dashboardUrl(site, deployment)),
      annotations:
        outcome.kind === "failed"
          ? outcome.diagnostics
              .filter((diagnostic) => diagnostic.file)
              .map((diagnostic) => ({
                path: [site.rootDirectory, diagnostic.file]
                  .filter(Boolean)
                  .join("/"),
                start_line: diagnostic.line ?? 1,
                end_line: diagnostic.line ?? 1,
                annotation_level:
                  diagnostic.severity === "error"
                    ? ("failure" as const)
                    : ("warning" as const),
                message: diagnostic.message.slice(
                  0,
                  CHECK_RUN_ANNOTATION_MAX_LENGTH
                ),
              }))
          : undefined,
    });
  });
}

async function reportPreviewComment(
  site: Site,
  deployment: SiteDeployment,
  outcome?: DeploymentOutcome
): Promise<void> {
  const pullRequestNumber = deployment.pullRequestNumber;
  if (deployment.kind !== "preview" || !pullRequestNumber) {
    return;
  }
  await safely("preview_comment", () =>
    db.transaction(async (tx) => {
      // Serialize comment creation and updates across workers and retries.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`sites-preview-comment:${site.id}:${pullRequestNumber}`}, 0))`
      );
      const [currentSite] = await tx
        .select()
        .from(sites)
        .where(eq(sites.id, site.id))
        .limit(1)
        .for("share");
      if (
        !currentSite ||
        currentSite.status !== "active" ||
        !currentSite.previewsEnabled ||
        !currentSite.previewCommentsEnabled
      ) {
        return;
      }
      const [latest] = await tx
        .select()
        .from(siteDeployments)
        .where(
          and(
            eq(siteDeployments.siteId, site.id),
            eq(siteDeployments.kind, "preview"),
            eq(siteDeployments.pullRequestNumber, pullRequestNumber)
          )
        )
        .orderBy(desc(siteDeployments.generation))
        .limit(1)
        .for("share");
      if (
        latest?.id !== deployment.id ||
        (!outcome &&
          !["queued", "building", "uploading"].includes(latest.status)) ||
        (outcome?.kind === "failed" && latest.status !== "failed") ||
        ((outcome?.kind === "live" || outcome?.kind === "not_live") &&
          latest.status !== "ready") ||
        (outcome?.kind === "skipped" &&
          !["canceled", "superseded"].includes(latest.status))
      ) {
        return;
      }
      const { repository, token } = await siteRepositoryAccess(site, {
        pull_requests: "write",
      });
      await upsertPreviewComment(repository, token, {
        marker: `<!-- notra-preview:${site.id} -->`,
        pullRequestNumber,
        commitSha: latest.commitSha,
        productionBranch: currentSite.productionBranch,
        body: previewCommentBody(
          currentSite,
          latest,
          await dashboardUrl(currentSite, latest),
          outcome
        ),
      });
    })
  );
}
