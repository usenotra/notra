import { db } from "@notra/db/drizzle";
import { sites } from "@notra/db/schema";
import { SITE_R2_KEYS } from "@notra/sites-core/constants/sites";
import type {
  PreviewActivationResult,
  ProductionActivationResult,
} from "@notra/sites-core/types/serving-state";
import { referencedDeploymentIds } from "@notra/sites-core/utils/serving-state";
import { eq } from "drizzle-orm";

import { allocateGeneration } from "./deployments";
import { r2GetText } from "./r2";
import {
  activatePreviewDeployment,
  activateProductionDeployment,
  readServingState,
} from "./state";
import type {
  ActivationOutcome,
  LiveDeployments,
  SiteDeployment,
} from "./types/deployments";
import type { Site } from "./types/sites";
import { invalidateSiteIngestCaches } from "./utils/ingest-cache";
import { withSiteStorageLock } from "./utils/site-storage-lock";

async function hasStoredFiles(
  site: Site,
  deployment: SiteDeployment
): Promise<boolean> {
  return Boolean(
    await r2GetText(SITE_R2_KEYS.manifest(site.id, deployment.id))
  );
}

function liveUnlessSuperseded(
  outcome: ProductionActivationResult | PreviewActivationResult
): ActivationOutcome {
  return outcome.outcome === "superseded" ? "not_live" : "live";
}

export async function activateDeployment(
  site: Site,
  deployment: SiteDeployment
): Promise<ActivationOutcome> {
  const outcome = await withSiteStorageLock(site.id, async (tx) => {
    const [currentSite] = await tx
      .select()
      .from(sites)
      .where(eq(sites.id, site.id))
      .for("update");
    if (
      !currentSite ||
      currentSite.status !== "active" ||
      (deployment.kind === "preview" && !currentSite.previewsEnabled) ||
      !(await hasStoredFiles(currentSite, deployment))
    ) {
      return "not_live";
    }
    if (deployment.kind === "production") {
      return liveUnlessSuperseded(
        await activateProductionDeployment(
          currentSite,
          {
            deploymentId: deployment.id,
            generation: deployment.generation,
          },
          tx
        )
      );
    }
    if (!deployment.previewKey) {
      throw new Error("Preview deployment without a preview key");
    }
    return liveUnlessSuperseded(
      await activatePreviewDeployment(
        currentSite,
        deployment.previewKey,
        {
          deploymentId: deployment.id,
          sequence: deployment.generation,
          visibility: currentSite.previewVisibility,
          expiresAt: null,
        },
        tx
      )
    );
  });
  if (outcome === "live" && deployment.kind === "production") {
    await invalidateSiteIngestCaches(site);
  }
  return outcome;
}

export async function restoreProductionDeployment(
  site: Site,
  deployment: SiteDeployment
): Promise<ActivationOutcome> {
  const { lastGeneration } = await allocateGeneration(db, site.id);
  const outcome = await withSiteStorageLock(site.id, async (tx) => {
    const [currentSite] = await tx
      .select()
      .from(sites)
      .where(eq(sites.id, site.id))
      .for("update");
    if (
      !currentSite ||
      currentSite.status !== "active" ||
      !(await hasStoredFiles(currentSite, deployment))
    ) {
      return "not_live";
    }
    return liveUnlessSuperseded(
      await activateProductionDeployment(
        currentSite,
        {
          deploymentId: deployment.id,
          generation: lastGeneration,
        },
        tx
      )
    );
  });
  if (outcome === "live") {
    await invalidateSiteIngestCaches(site);
  }
  return outcome;
}

export async function readLiveDeployments(
  siteId: string
): Promise<LiveDeployments> {
  const serving = await readServingState(siteId);
  return {
    previews: serving?.state.previews ?? {},
    ids: serving ? referencedDeploymentIds(serving.state) : new Set(),
  };
}
