import { SITE_DEPLOYMENT_PHASES } from "@notra/sites-core/constants/deployment-timeline";

import { SITE_DEPLOYMENT_PHASE_MARKER } from "@/constants/site-deployment-timeline";
import type {
  SiteDeploymentPhaseId,
  SiteDeploymentPhaseState,
  SiteDeploymentTimelinePhase,
  SiteDeploymentTimelineRecord,
} from "@/types/site-deployment-timeline";
import {
  formatBuildDuration,
  isDeploymentInProgress,
} from "@/utils/site-deployments";

export function deploymentTimelinePhases(
  deployment: SiteDeploymentTimelineRecord,
  log: string | null,
  now: number
): SiteDeploymentTimelinePhase[] {
  const createdAt = new Date(deployment.createdAt).getTime();
  const startedAt = deployment.startedAt
    ? new Date(deployment.startedAt).getTime()
    : null;
  const finishedAt = deployment.finishedAt
    ? new Date(deployment.finishedAt).getTime()
    : null;
  if (!Number.isFinite(createdAt)) {
    return [];
  }
  const running = isDeploymentInProgress(deployment.status);
  const end = running ? now : finishedAt;
  const markers = new Map<SiteDeploymentPhaseId, number>();
  let previous = startedAt ?? createdAt;
  let next = 0;
  for (const line of (log ?? "").split("\n")) {
    if (!line.startsWith("[deployment:")) {
      break;
    }
    const match = SITE_DEPLOYMENT_PHASE_MARKER.exec(line);
    const phase = SITE_DEPLOYMENT_PHASES[next];
    if (!match || !phase || match[1] !== phase) {
      continue;
    }
    const timestamp = Date.parse(match[2] ?? "");
    if (
      !Number.isFinite(timestamp) ||
      timestamp < previous ||
      (!running && end !== null && timestamp > end)
    ) {
      continue;
    }
    markers.set(phase, timestamp);
    previous = timestamp;
    next += 1;
  }

  const phases: Array<Pick<SiteDeploymentTimelinePhase, "id" | "startedAt">> =
    markers.has("preparing") || deployment.status === "queued"
      ? [
          { id: "queued", startedAt: createdAt },
          ...SITE_DEPLOYMENT_PHASES.map((id) => ({
            id,
            startedAt: markers.get(id) ?? null,
          })),
        ]
      : [
          { id: "queued", startedAt: createdAt },
          { id: "execution", startedAt },
        ];
  let terminalState: SiteDeploymentPhaseState = "complete";
  if (deployment.status === "failed") {
    terminalState = "failed";
  } else if (
    deployment.status === "canceled" ||
    deployment.status === "skipped" ||
    deployment.status === "superseded"
  ) {
    terminalState = "stopped";
  }
  return phases.map((phase, index) => {
    const deployed =
      deployment.status === "ready" || deployment.status === "expired";
    const deploying = deployment.status === "uploading";
    if (phase.startedAt === null) {
      let state: SiteDeploymentPhaseState = "pending";
      if (deployed || deploying) {
        state = phase.id === "deploying" && deploying ? "active" : "unknown";
      }
      return {
        id: phase.id,
        state,
        startedAt: null,
        durationMs: null,
      };
    }
    const nextStart =
      phase.id === "queued"
        ? (startedAt ?? markers.get("preparing") ?? null)
        : (phases[index + 1]?.startedAt ?? null);
    const missingBoundary =
      markers.has("preparing") &&
      phase.id !== "queued" &&
      phase.id !== "deploying" &&
      nextStart === null &&
      (deployed || deploying);
    const phaseEnd = missingBoundary ? null : (nextStart ?? end);
    let state: SiteDeploymentPhaseState = terminalState;
    if (nextStart !== null || missingBoundary) {
      state = "complete";
    } else if (running) {
      state = "active";
    }
    return {
      id: phase.id,
      state,
      startedAt: phase.startedAt,
      durationMs:
        phaseEnd !== null && Number.isFinite(phaseEnd)
          ? Math.max(0, phaseEnd - phase.startedAt)
          : null,
    };
  });
}

export function formatDeploymentPhaseDuration(
  ms: number | null,
  locale: string
): string | null {
  if (ms === null) {
    return null;
  }
  return ms < 1000
    ? `${new Intl.NumberFormat(locale).format(Math.round(ms))}ms`
    : formatBuildDuration(ms);
}
