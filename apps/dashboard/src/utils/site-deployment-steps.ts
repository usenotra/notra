import type {
  SiteDeployment,
  SiteDeploymentStep,
  SiteDeploymentStepKey,
  SiteDeploymentStepState,
} from "@/types/sites";

type StepDeployment = Pick<
  SiteDeployment,
  "status" | "createdAt" | "startedAt" | "finishedAt" | "buildDurationMs"
>;

const STEP_KEYS: readonly SiteDeploymentStepKey[] = [
  "queued",
  "building",
  "uploading",
  "ready",
];

function msBetween(start: Date | string, end: Date | string | number): number {
  return new Date(end).getTime() - new Date(start).getTime();
}

/** Index of the step the deployment is in, or stopped in. */
function reachedStep(deployment: StepDeployment): number {
  switch (deployment.status) {
    case "queued":
    case "superseded":
      return 0;
    case "building":
      return 1;
    case "uploading":
      return 2;
    case "ready":
    case "expired":
      return STEP_KEYS.length;
    case "failed":
    case "canceled":
      // Without a start time the job never left the queue.
      return deployment.startedAt ? 1 : 0;
    default:
      return 0;
  }
}

function stateFor(
  deployment: StepDeployment,
  index: number,
  reached: number
): SiteDeploymentStepState {
  if (index < reached) {
    return "done";
  }
  if (index > reached) {
    return reached === STEP_KEYS.length ||
      deployment.status === "queued" ||
      deployment.status === "building" ||
      deployment.status === "uploading"
      ? "pending"
      : "skipped";
  }
  switch (deployment.status) {
    case "failed":
      return "failed";
    case "canceled":
    case "superseded":
      return "skipped";
    default:
      return "active";
  }
}

/**
 * Queued → Building → Uploading → Ready, with how long each took. Only the
 * queue wait and the build itself have timestamps; uploading is short and
 * shares the build's clock.
 */
export function deploymentSteps(
  deployment: StepDeployment,
  now: number
): SiteDeploymentStep[] {
  const reached = reachedStep(deployment);
  const end = deployment.finishedAt ?? now;
  const queuedMs = msBetween(deployment.createdAt, deployment.startedAt ?? end);
  const buildingMs = deployment.startedAt
    ? (deployment.buildDurationMs ?? msBetween(deployment.startedAt, end))
    : null;
  return STEP_KEYS.map((key, index) => {
    const state = stateFor(deployment, index, reached);
    let durationMs: number | null = null;
    if (key === "queued" && state !== "pending") {
      durationMs = queuedMs;
    } else if (key === "building" && state !== "pending") {
      durationMs = buildingMs;
    }
    return { key, state, durationMs };
  });
}
