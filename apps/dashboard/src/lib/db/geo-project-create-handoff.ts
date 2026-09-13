import type { GeoProject } from "@notra/geo-core/types/geo";

const CREATE_HANDOFF_TTL_MS = 60_000;

interface PendingCreateHandoff {
  resolve: (project: GeoProject) => void;
  reject: (error: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

const pendingCreateHandoffs = new Map<string, PendingCreateHandoff>();

function clearHandoff(transactionId: string) {
  const pending = pendingCreateHandoffs.get(transactionId);
  if (!pending) {
    return;
  }
  clearTimeout(pending.timer);
  pendingCreateHandoffs.delete(transactionId);
}

export function waitForProjectCreateHandoff(
  transactionId: string
): Promise<GeoProject> {
  return new Promise((resolve, reject) => {
    clearHandoff(transactionId);
    const timer = setTimeout(() => {
      clearHandoff(transactionId);
      reject(new Error("Project create handoff timed out"));
    }, CREATE_HANDOFF_TTL_MS);

    pendingCreateHandoffs.set(transactionId, {
      resolve,
      reject,
      timer,
    });
  });
}

export function resolveProjectCreateHandoff(
  transactionId: string,
  project: GeoProject
): void {
  const pending = pendingCreateHandoffs.get(transactionId);
  if (!pending) {
    return;
  }
  clearHandoff(transactionId);
  pending.resolve(project);
}

export function rejectProjectCreateHandoff(
  transactionId: string,
  error: unknown
): void {
  const pending = pendingCreateHandoffs.get(transactionId);
  if (!pending) {
    return;
  }
  clearHandoff(transactionId);
  pending.reject(error);
}
