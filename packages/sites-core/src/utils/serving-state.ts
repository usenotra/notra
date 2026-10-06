import { SITE_MAX_REMOVED_PREVIEWS } from "@notra/sites-core/constants/sites";
import type {
  SitePreviewPointer,
  SiteServingState,
} from "@notra/sites-core/types/deployment";
import type {
  InitialServingStateParams,
  PreviewActivationResult,
  ProductionActivationResult,
  ProductionPointerInput,
} from "@notra/sites-core/types/serving-state";

export function createInitialServingState(
  params: InitialServingStateParams
): SiteServingState {
  return {
    version: 1,
    siteId: params.siteId,
    slug: params.slug,
    status: "active",
    production: null,
    previews: {},
    removedPreviews: {},
    previewPassword: null,
    trafficToken: null,
    revokedSessions: {},
    updatedAt: params.now.toISOString(),
  };
}

export function activateProductionInState(
  state: SiteServingState,
  pointer: ProductionPointerInput,
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
    .slice(0, SITE_MAX_REMOVED_PREVIEWS);
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
