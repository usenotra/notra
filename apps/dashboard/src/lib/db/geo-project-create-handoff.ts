import type { GeoProject } from "@notra/geo-core/types/geo";

interface PendingCreateHandoff {
  resolve: (project: GeoProject) => void;
  reject: (error: unknown) => void;
}

const pendingCreateHandoffs = new Map<string, PendingCreateHandoff>();

function clearHandoff(transactionId: string) {
  pendingCreateHandoffs.delete(transactionId);
}

export function waitForProjectCreateHandoff(
  transactionId: string
): Promise<GeoProject> {
  return new Promise((resolve, reject) => {
    clearHandoff(transactionId);
    pendingCreateHandoffs.set(transactionId, { resolve, reject });
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

/** Clears a handoff when the caller stops waiting before persistence settles. */
export function abandonProjectCreateHandoff(transactionId: string): void {
  const pending = pendingCreateHandoffs.get(transactionId);
  if (!pending) {
    return;
  }
  clearHandoff(transactionId);
  pending.reject(new Error("Project create was interrupted"));
}
