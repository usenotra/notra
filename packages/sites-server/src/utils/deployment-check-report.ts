import { UNCHANGED_BUILD_TITLE } from "../constants/github";
import type { DeploymentOutcome, SiteDeployment } from "../types/deployments";
import type { CheckReport } from "../types/reporting";
import { primaryMountUrl } from "./urls";

export function deploymentCheckReport(
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
    case "skipped": {
      const unchanged = deployment.status === "skipped";
      const url = unchanged
        ? primaryMountUrl(
            deployment.target.publicOrigin,
            deployment.target.mounts
          )
        : null;
      return {
        conclusion: "skipped",
        title: unchanged ? UNCHANGED_BUILD_TITLE : "Skipped",
        summary: url
          ? `${outcome.reason}\n\n${deployment.kind === "production" ? "Published" : "Preview"}: ${url}\n\nThe existing version is still being served.`
          : outcome.reason,
        liveUrl: url,
      };
    }
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
