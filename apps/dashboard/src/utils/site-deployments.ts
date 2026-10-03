import {
  SITE_DEPLOYMENT_IN_PROGRESS_STATUSES,
  SITE_SHORT_SHA_LENGTH,
} from "@/constants/sites";
import type { SiteDeployment, SiteDeploymentStatus } from "@/types/sites";

const MS_PER_SECOND = 1000;

const ESCAPE = String.fromCharCode(27);
/** Terminal color and cursor sequences the build tools print into the log. */
const ANSI_SEQUENCE = new RegExp(`${ESCAPE}\\[[0-9;?]*[A-Za-z]`, "g");

const SECONDS_PER_MINUTE = 60;

export function isDeploymentInProgress(status: SiteDeploymentStatus): boolean {
  return SITE_DEPLOYMENT_IN_PROGRESS_STATUSES.has(status);
}

export function hasDeploymentInProgress(
  deployments: readonly Pick<SiteDeployment, "status">[]
): boolean {
  return deployments.some((deployment) =>
    isDeploymentInProgress(deployment.status)
  );
}

export function stripAnsi(text: string): string {
  return text.replace(ANSI_SEQUENCE, "");
}

export function shortSha(sha: string): string {
  return sha.slice(0, SITE_SHORT_SHA_LENGTH);
}

/** First line of a commit message; GitHub shows the same as the title. */
export function commitTitle(message: string | null): string | null {
  const title = message?.split("\n", 1)[0]?.trim();
  return title ? title : null;
}

export function formatBuildDuration(ms: number | null): string | null {
  if (ms === null || ms < 0) {
    return null;
  }
  const totalSeconds = Math.max(1, Math.round(ms / MS_PER_SECOND));
  if (totalSeconds < SECONDS_PER_MINUTE) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

/** Wall time of a deployment from when work started until it finished (or now). */
export function deploymentElapsedMs(
  deployment: Pick<
    SiteDeployment,
    "buildDurationMs" | "startedAt" | "finishedAt" | "createdAt"
  >,
  now = Date.now()
): number | null {
  if (deployment.buildDurationMs !== null) {
    return deployment.buildDurationMs;
  }
  const start = deployment.startedAt ?? deployment.createdAt;
  const end = deployment.finishedAt ? deployment.finishedAt.getTime() : now;
  return end - new Date(start).getTime();
}
