import type { GeoProject } from "@notra/geo-core/types/geo";

const snapshotsByCollection = new Map<string, Map<string, GeoProject>>();
const listeners = new Set<() => void>();

const EMPTY_SNAPSHOTS: ReadonlyMap<string, GeoProject> = new Map();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeToPendingDeleteSnapshots(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function getPendingDeleteSnapshots(
  collectionId: string
): ReadonlyMap<string, GeoProject> {
  return snapshotsByCollection.get(collectionId) ?? EMPTY_SNAPSHOTS;
}

export function rememberPendingDeleteSnapshot(
  collectionId: string,
  project: GeoProject
): void {
  const next = new Map(snapshotsByCollection.get(collectionId) ?? []);
  next.set(project.id, project);
  snapshotsByCollection.set(collectionId, next);
  notify();
}

export function clearPendingDeleteSnapshot(
  collectionId: string,
  projectId: string
): void {
  const current = snapshotsByCollection.get(collectionId);
  if (!current?.has(projectId)) {
    return;
  }

  const next = new Map(current);
  next.delete(projectId);
  if (next.size === 0) {
    snapshotsByCollection.delete(collectionId);
  } else {
    snapshotsByCollection.set(collectionId, next);
  }
  notify();
}
