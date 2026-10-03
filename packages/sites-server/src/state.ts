import { SITE_R2_KEYS } from "@notra/sites-core/constants/sites";
import {
  type SiteHostRecord,
  type SitePreviewPointer,
  type SiteServingState,
  siteHostRecordSchema,
  siteServingStateSchema,
} from "@notra/sites-core/schemas/deployment";
import {
  type PreviewActivationResult,
  type ProductionActivationResult,
  activatePreviewInState,
  activateProductionInState,
  createInitialServingState,
  removePreviewFromState,
  setPreviewVisibilityInState,
} from "@notra/sites-core/utils/serving-state";

import { R2PreconditionFailedError, r2DeleteKey, r2GetText, r2Put } from "./r2";

const CAS_ATTEMPTS = 6;
const JSON_TYPE = "application/json; charset=utf-8";

export class SiteHostConflictError extends Error {
  readonly name = "SiteHostConflictError";
}

export async function readServingState(
  siteId: string
): Promise<{ state: SiteServingState; etag: string } | null> {
  const object = await r2GetText(SITE_R2_KEYS.state(siteId));
  if (!object) {
    return null;
  }
  return {
    state: siteServingStateSchema.parse(JSON.parse(object.text)),
    etag: object.etag,
  };
}

type MutationResult<T> =
  | { write: SiteServingState; result: T }
  | { skip: true; result: T };

/**
 * Read-modify-write of `state.json` guarded by the object's ETag. Concurrent
 * writers (two builds finishing, a rollback during a deploy) retry on 412
 * instead of overwriting each other.
 */
export async function mutateServingState<T>(
  site: { id: string; slug: string },
  mutate: (state: SiteServingState) => MutationResult<T>
): Promise<T> {
  for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt += 1) {
    const current = await readServingState(site.id);
    const state =
      current?.state ??
      createInitialServingState({
        siteId: site.id,
        slug: site.slug,
        now: new Date(),
      });
    const outcome = mutate(state);
    if ("skip" in outcome) {
      return outcome.result;
    }
    try {
      await r2Put(SITE_R2_KEYS.state(site.id), JSON.stringify(outcome.write), {
        contentType: JSON_TYPE,
        cacheControl: "no-store",
        ...(current
          ? { ifMatch: current.etag }
          : { ifNoneMatch: "*" as const }),
      });
      return outcome.result;
    } catch (error) {
      if (!(error instanceof R2PreconditionFailedError)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 50 * 2 ** attempt));
    }
  }
  throw new Error(
    `Could not update serving state for ${site.id}: too much contention`
  );
}

export async function activateProductionDeployment(
  site: { id: string; slug: string },
  pointer: { deploymentId: string; generation: number }
) {
  return await mutateServingState<ProductionActivationResult>(site, (state) => {
    const outcome = activateProductionInState(state, pointer, new Date());
    if (outcome.outcome === "activated") {
      return { write: outcome.state, result: outcome };
    }
    return { skip: true, result: outcome };
  });
}

export async function activatePreviewDeployment(
  site: { id: string; slug: string },
  previewKey: string,
  pointer: Omit<SitePreviewPointer, "activatedAt">
) {
  return await mutateServingState<PreviewActivationResult>(site, (state) => {
    const outcome = activatePreviewInState(
      state,
      previewKey,
      pointer,
      new Date()
    );
    if (outcome.outcome === "activated") {
      return { write: outcome.state, result: outcome };
    }
    return { skip: true, result: outcome };
  });
}

export async function removePreviewDeployment(
  site: { id: string; slug: string },
  previewKey: string,
  generation: number
) {
  await mutateServingState(site, (state) => ({
    write: removePreviewFromState(state, previewKey, generation, new Date()),
    result: undefined,
  }));
}

export async function setServingStatus(
  site: { id: string; slug: string },
  status: SiteServingState["status"]
) {
  await mutateServingState(site, (state) => {
    if (state.status === status && state.slug === site.slug) {
      return { skip: true, result: undefined };
    }
    return {
      write: {
        ...state,
        status,
        slug: site.slug,
        updatedAt: new Date().toISOString(),
      },
      result: undefined,
    };
  });
}

export async function setServingPreviewVisibility(
  site: { id: string; slug: string },
  visibility: SitePreviewPointer["visibility"]
) {
  await mutateServingState(site, (state) => ({
    write: setPreviewVisibilityInState(state, visibility, new Date()),
    result: undefined,
  }));
}

/**
 * Host records map a hostname to a site. They are created only once (If-None-Match)
 * so one tenant can never take over a hostname another tenant registered.
 */
export async function claimHostRecord(
  hostname: string,
  record: Omit<SiteHostRecord, "version">
): Promise<void> {
  const key = SITE_R2_KEYS.host(hostname);
  const body = JSON.stringify({
    version: 1,
    ...record,
  } satisfies SiteHostRecord);
  try {
    await r2Put(key, body, {
      contentType: JSON_TYPE,
      cacheControl: "no-store",
      ifNoneMatch: "*",
    });
  } catch (error) {
    if (!(error instanceof R2PreconditionFailedError)) {
      throw error;
    }
    const existing = await r2GetText(key);
    const parsed = existing
      ? siteHostRecordSchema.safeParse(JSON.parse(existing.text))
      : null;
    if (
      parsed?.success &&
      parsed.data.siteId === record.siteId &&
      parsed.data.kind === record.kind
    ) {
      return;
    }
    throw new SiteHostConflictError(
      `${hostname} already belongs to another site`
    );
  }
}

export async function releaseHostRecord(
  hostname: string,
  siteId: string
): Promise<void> {
  const key = SITE_R2_KEYS.host(hostname);
  const existing = await r2GetText(key);
  if (!existing) {
    return;
  }
  const parsed = siteHostRecordSchema.safeParse(JSON.parse(existing.text));
  if (parsed.success && parsed.data.siteId === siteId) {
    await r2DeleteKey(key);
  }
}
