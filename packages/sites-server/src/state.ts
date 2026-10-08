import { db } from "@notra/db/drizzle";
import { siteDeployments, sites } from "@notra/db/schema";
import { buildGeoIngestSiteToken } from "@notra/geo-core/geo/ingest";
import { SITE_R2_KEYS } from "@notra/sites-core/constants/sites";
import {
  siteHostRecordSchema,
  siteServingStateSchema,
} from "@notra/sites-core/schemas/deployment";
import type {
  SiteHostRecord,
  SitePreviewPassword,
  SitePreviewPointer,
  SiteServingState,
} from "@notra/sites-core/types/deployment";
import type {
  PreviewActivationResult,
  ProductionActivationResult,
  ProductionPointerInput,
} from "@notra/sites-core/types/serving-state";
import {
  activatePreviewInState,
  activateProductionInState,
  createInitialServingState,
  removePreviewFromState,
  setPreviewVisibilityInState,
} from "@notra/sites-core/utils/serving-state";
import { and, eq, isNotNull, lte } from "drizzle-orm";

import { JSON_CONTENT_TYPE } from "./constants/content-types";
import { CAS_ATTEMPTS, CAS_BACKOFF_MS } from "./constants/state";
import { R2PreconditionFailedError, SiteHostConflictError } from "./errors";
import { r2DeleteKey, r2GetText, r2Put } from "./r2";
import type { SiteStorageTransaction } from "./types/deployments";
import type {
  ServingPreviewAccess,
  ServingSiteRef,
  ServingStateMutation,
  ServingStateObject,
} from "./types/state";
import { withSiteHostLock } from "./utils/site-host-lock";

function samePreviewPassword(
  a: SitePreviewPassword | null,
  b: SitePreviewPassword | null
): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return (
    a.version === b.version &&
    a.hash === b.hash &&
    a.salt === b.salt &&
    a.iterations === b.iterations &&
    a.algorithm === b.algorithm &&
    a.updatedAt === b.updatedAt
  );
}

async function readPreviewAccessFromDb(
  siteId: string,
  executor: Pick<typeof db, "select">
): Promise<ServingPreviewAccess> {
  const [row] = await executor
    .select({
      previewPassword: sites.previewPassword,
      previewVisibility: sites.previewVisibility,
    })
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1);
  return {
    previewPassword: row?.previewPassword ?? null,
    previewVisibility: row?.previewVisibility ?? null,
  };
}

export async function readServingState(
  siteId: string
): Promise<ServingStateObject | null> {
  const object = await r2GetText(SITE_R2_KEYS.state(siteId));
  if (!object) {
    return null;
  }
  return {
    state: siteServingStateSchema.parse(JSON.parse(object.text)),
    etag: object.etag,
  };
}

export async function mutateServingState<T>(
  site: ServingSiteRef,
  mutate: (
    state: SiteServingState,
    access: Pick<ServingPreviewAccess, "previewVisibility">
  ) => ServingStateMutation<T>,
  executor: Pick<typeof db, "select"> = db
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
    const { previewPassword, previewVisibility } =
      await readPreviewAccessFromDb(site.id, executor);
    const outcome = mutate(state, { previewVisibility });
    const trafficToken = buildGeoIngestSiteToken(site.id);
    const derivedInSync =
      samePreviewPassword(state.previewPassword, previewPassword) &&
      state.trafficToken === trafficToken;
    if ("skip" in outcome && (!current || derivedInSync)) {
      return outcome.result;
    }
    const write: SiteServingState = {
      ...("skip" in outcome ? state : outcome.write),
      previewPassword,
      trafficToken,
    };
    try {
      await r2Put(SITE_R2_KEYS.state(site.id), JSON.stringify(write), {
        contentType: JSON_CONTENT_TYPE,
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
      await new Promise((resolve) =>
        setTimeout(resolve, CAS_BACKOFF_MS * 2 ** attempt)
      );
    }
  }
  throw new Error(
    `Could not update serving state for ${site.id}: too much contention`
  );
}

function writeIfActivated<
  T extends ProductionActivationResult | PreviewActivationResult,
>(outcome: T): ServingStateMutation<T> {
  return outcome.outcome === "activated"
    ? { write: outcome.state, result: outcome }
    : { skip: true, result: outcome };
}

export async function activateProductionDeployment(
  site: ServingSiteRef,
  pointer: ProductionPointerInput,
  executor: SiteStorageTransaction
) {
  const outcome = await mutateServingState(
    site,
    (state) =>
      writeIfActivated(activateProductionInState(state, pointer, new Date())),
    executor
  );
  if (outcome.outcome === "activated" || outcome.outcome === "already_active") {
    await executor
      .update(sites)
      .set({ activeProductionDeploymentId: pointer.deploymentId })
      .where(eq(sites.id, site.id));
  }
  return outcome;
}

export async function reconcileProductionProjection(
  site: ServingSiteRef,
  executor: SiteStorageTransaction
): Promise<void> {
  const serving = await readServingState(site.id);
  const deploymentId = serving?.state.production?.deploymentId;
  const [deployment] = deploymentId
    ? await executor
        .select({ id: siteDeployments.id })
        .from(siteDeployments)
        .where(
          and(
            eq(siteDeployments.id, deploymentId),
            eq(siteDeployments.siteId, site.id),
            eq(siteDeployments.kind, "production")
          )
        )
        .limit(1)
    : [];
  await executor
    .update(sites)
    .set({ activeProductionDeploymentId: deployment?.id ?? null })
    .where(eq(sites.id, site.id));
}

export async function activatePreviewDeployment(
  site: ServingSiteRef,
  previewKey: string,
  pointer: Omit<SitePreviewPointer, "activatedAt">,
  executor: Pick<typeof db, "select"> = db
) {
  return await mutateServingState(
    site,
    (state, access) =>
      writeIfActivated(
        activatePreviewInState(
          state,
          previewKey,
          {
            ...pointer,
            visibility: access.previewVisibility ?? pointer.visibility,
          },
          new Date()
        )
      ),
    executor
  );
}

export async function removePreviewDeployment(
  site: ServingSiteRef,
  previewKey: string,
  generation: number
) {
  await mutateServingState(site, (state) => ({
    write: removePreviewFromState(state, previewKey, generation, new Date()),
    result: undefined,
  }));
}

export async function setServingStatus(
  site: ServingSiteRef,
  status: SiteServingState["status"],
  tx?: SiteStorageTransaction
) {
  await mutateServingState(
    site,
    (state) => {
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
    },
    tx ?? db
  );
}

export async function syncServingPreviewAccess(
  site: ServingSiteRef,
  executor: Pick<typeof db, "select"> = db,
  removePreviewsThrough: number | null = null
): Promise<string[]> {
  const candidates =
    removePreviewsThrough === null
      ? []
      : await executor
          .select({ previewKey: siteDeployments.previewKey })
          .from(siteDeployments)
          .where(
            and(
              eq(siteDeployments.siteId, site.id),
              eq(siteDeployments.kind, "preview"),
              isNotNull(siteDeployments.previewKey),
              lte(siteDeployments.generation, removePreviewsThrough)
            )
          );
  return await mutateServingState(
    site,
    (state, access) => {
      let write = setPreviewVisibilityInState(
        state,
        access.previewVisibility ?? "protected",
        new Date()
      );
      const keys = new Set<string>();
      if (removePreviewsThrough !== null) {
        for (const key of Object.keys(state.previews)) {
          keys.add(key);
        }
        for (const { previewKey } of candidates) {
          if (previewKey) {
            keys.add(previewKey);
          }
        }
        for (const key of keys) {
          write = removePreviewFromState(
            write,
            key,
            removePreviewsThrough,
            new Date()
          );
        }
      }
      return { write, result: [...keys] };
    },
    executor
  );
}

async function readHostRecord(
  hostname: string
): Promise<SiteHostRecord | null> {
  const existing = await r2GetText(SITE_R2_KEYS.host(hostname));
  if (!existing) {
    return null;
  }
  const parsed = siteHostRecordSchema.safeParse(JSON.parse(existing.text));
  return parsed.success ? parsed.data : null;
}

export async function claimHostRecord(
  hostname: string,
  record: Omit<SiteHostRecord, "version">
): Promise<void> {
  const body = JSON.stringify({
    version: 1,
    ...record,
  } satisfies SiteHostRecord);
  try {
    await r2Put(SITE_R2_KEYS.host(hostname), body, {
      contentType: JSON_CONTENT_TYPE,
      cacheControl: "no-store",
      ifNoneMatch: "*",
    });
  } catch (error) {
    if (!(error instanceof R2PreconditionFailedError)) {
      throw error;
    }
    const existing = await readHostRecord(hostname);
    if (existing?.siteId === record.siteId && existing.kind === record.kind) {
      return;
    }
    throw new SiteHostConflictError(
      `${hostname} already belongs to another site`
    );
  }
}

export async function releaseHostRecord(
  hostname: string,
  siteId: string,
  tx?: SiteStorageTransaction
): Promise<void> {
  await withSiteHostLock(
    hostname,
    async () => {
      if ((await readHostRecord(hostname))?.siteId === siteId) {
        await r2DeleteKey(SITE_R2_KEYS.host(hostname));
      }
    },
    { tx }
  );
}
