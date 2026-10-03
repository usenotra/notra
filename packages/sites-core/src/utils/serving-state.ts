import type {
  SitePreviewPointer,
  SiteServingState,
} from "@notra/sites-core/schemas/deployment";

export function createInitialServingState(params: {
  siteId: string;
  slug: string;
  now: Date;
}): SiteServingState {
  return {
    version: 1,
    siteId: params.siteId,
    slug: params.slug,
    status: "active",
    production: null,
    previews: {},
    removedPreviews: {},
    updatedAt: params.now.toISOString(),
  };
}

export type ProductionActivationResult =
  | { outcome: "activated"; state: SiteServingState }
  | { outcome: "already_active"; state: SiteServingState }
  | { outcome: "superseded"; activeGeneration: number };

/**
 * A pointer only ever moves forward. A late build of an older push, or a
 * retried activation after a crash, can therefore never undo a newer release
 * or a rollback (rollbacks allocate a fresh generation).
 */
export function activateProductionInState(
  state: SiteServingState,
  pointer: { deploymentId: string; generation: number },
  now: Date
): ProductionActivationResult {
  const current = state.production;
  if (
    current?.deploymentId === pointer.deploymentId &&
    current.generation === pointer.generation
  ) {
    return { outcome: "already_active", state };
  }
  if (current && current.generation >= pointer.generation) {
    return { outcome: "superseded", activeGeneration: current.generation };
  }
  return {
    outcome: "activated",
    state: {
      ...state,
      production: {
        deploymentId: pointer.deploymentId,
        generation: pointer.generation,
        activatedAt: now.toISOString(),
      },
      updatedAt: now.toISOString(),
    },
  };
}

export type PreviewActivationResult =
  | { outcome: "activated"; state: SiteServingState }
  | { outcome: "superseded"; activeSequence: number };

/** Previews are ordered per key by a sequence (the DB row counter), same forward-only rule. */
export function activatePreviewInState(
  state: SiteServingState,
  previewKey: string,
  pointer: Omit<SitePreviewPointer, "activatedAt">,
  now: Date
): PreviewActivationResult {
  const current = state.previews[previewKey];
  if (current && current.sequence > pointer.sequence) {
    return { outcome: "superseded", activeSequence: current.sequence };
  }
  // The preview was removed (PR closed) after this build was queued.
  const removedAt = state.removedPreviews[previewKey];
  if (removedAt !== undefined && removedAt > pointer.sequence) {
    return { outcome: "superseded", activeSequence: removedAt };
  }
  return {
    outcome: "activated",
    state: {
      ...state,
      previews: {
        ...state.previews,
        [previewKey]: { ...pointer, activatedAt: now.toISOString() },
      },
      updatedAt: now.toISOString(),
    },
  };
}

const MAX_REMOVED_PREVIEWS = 200;

/**
 * Removes a preview and leaves a tombstone at `generation`, so a build of that
 * preview that was still running cannot re-activate it afterwards.
 */
export function removePreviewFromState(
  state: SiteServingState,
  previewKey: string,
  generation: number,
  now: Date
): SiteServingState {
  const previews = { ...state.previews };
  delete previews[previewKey];
  const tombstones = Object.entries({
    ...state.removedPreviews,
    [previewKey]: generation,
  })
    .sort(([, a], [, b]) => b - a)
    .slice(0, MAX_REMOVED_PREVIEWS);
  return {
    ...state,
    previews,
    removedPreviews: Object.fromEntries(tombstones),
    updatedAt: now.toISOString(),
  };
}

export function setPreviewVisibilityInState(
  state: SiteServingState,
  visibility: SitePreviewPointer["visibility"],
  now: Date
): SiteServingState {
  const previews: SiteServingState["previews"] = {};
  for (const [key, pointer] of Object.entries(state.previews)) {
    previews[key] = { ...pointer, visibility };
  }
  return { ...state, previews, updatedAt: now.toISOString() };
}

export function isPreviewExpired(
  pointer: SitePreviewPointer,
  now: Date
): boolean {
  return (
    pointer.expiresAt !== null && Date.parse(pointer.expiresAt) <= now.getTime()
  );
}

/** Every deployment the serving state still references; cleanup must never delete these. */
export function referencedDeploymentIds(state: SiteServingState): Set<string> {
  const ids = new Set<string>();
  if (state.production) {
    ids.add(state.production.deploymentId);
  }
  for (const pointer of Object.values(state.previews)) {
    ids.add(pointer.deploymentId);
  }
  return ids;
}
