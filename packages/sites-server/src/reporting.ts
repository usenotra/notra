import { db } from "@notra/db/drizzle";
import { organizations, siteDeployments } from "@notra/db/schema";
import type { SiteDiagnostic } from "@notra/sites-core/schemas/build";
import { eq } from "drizzle-orm";

import type { Site, SiteDeployment } from "./deployments";
import {
  type CheckRunConclusion,
  completeCheckRun,
  createCheckRun,
  requireSiteRepository,
  siteRepositoryToken,
} from "./github";
import { deploymentDashboardUrl, primaryMountUrl } from "./urls";

const CHECK_RUN_NAME = "Notra Sites";

/** How a deployment ended. Every path reports through `reportOutcome`, nowhere else. */
export type DeploymentOutcome =
  | { kind: "live" }
  /** Built and stored, but a newer deployment was already live. */
  | { kind: "not_live" }
  /** Not built: suspended site, newer commit, or preview closed. */
  | { kind: "skipped"; reason: string }
  | { kind: "failed"; summary: string; diagnostics: SiteDiagnostic[] };

/** Reporting never fails a deployment: GitHub being slow or a missing `checks` permission is not a build problem. */
async function safely<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    console.warn(
      `sites.${label}_failed`,
      error instanceof Error ? error.message : error
    );
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

export function summarizeDiagnostics(diagnostics: SiteDiagnostic[]): string {
  const errors = diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error"
  );
  if (errors.length === 0) {
    return "The build failed. See the log for details.";
  }
  return errors
    .slice(0, 10)
    .map((diagnostic) => {
      const location = diagnostic.file
        ? `\`${diagnostic.file}${diagnostic.line ? `:${diagnostic.line}` : ""}\``
        : "Site";
      return `- ${location}: ${diagnostic.message.split("\n")[0]}`;
    })
    .join("\n");
}

/** Opens the "in progress" GitHub check for a deployment once; returns the deployment with its check id. */
export async function openCheckRun(
  site: Site,
  deployment: SiteDeployment
): Promise<SiteDeployment> {
  if (deployment.checkRunId) {
    return deployment;
  }
  const checkRunId = await safely("check_create", async () => {
    const repository = requireSiteRepository(site);
    const token = await siteRepositoryToken(repository, { checks: "write" });
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

interface CheckReport {
  conclusion: CheckRunConclusion;
  title: string;
  summary: string;
  liveUrl: string | null;
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

/** The single place a deployment's result reaches GitHub. */
export async function reportOutcome(
  site: Site,
  deployment: SiteDeployment,
  outcome: DeploymentOutcome
): Promise<void> {
  const checkRunId = deployment.checkRunId;
  if (!checkRunId) {
    return;
  }
  const check = checkFor(deployment, outcome);
  await safely("check_complete", async () => {
    const repository = requireSiteRepository(site);
    const token = await siteRepositoryToken(repository, { checks: "write" });
    await completeCheckRun(repository, token, {
      checkRunId,
      conclusion: check.conclusion,
      title: check.title,
      summary: check.summary.slice(0, 60_000),
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
                message: diagnostic.message.slice(0, 1000),
              }))
          : undefined,
    });
  });
}
