import { db } from "@notra/db/drizzle";
import { SITE_R2_KEYS } from "@notra/sites-core/constants/sites";
import type {
  PreviewActivationResult,
  ProductionActivationResult,
} from "@notra/sites-core/types/serving-state";
import { referencedDeploymentIds } from "@notra/sites-core/utils/serving-state";

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
  if (!(await hasStoredFiles(site, deployment))) {
    return "not_live";
  }
  if (deployment.kind === "production") {
    return liveUnlessSuperseded(
      await activateProductionDeployment(site, {
        deploymentId: deployment.id,
        generation: deployment.generation,
      })
    );
  }
  if (!deployment.previewKey) {
    throw new Error("Preview deployment without a preview key");
  }
  return liveUnlessSuperseded(
    await activatePreviewDeployment(site, deployment.previewKey, {
      deploymentId: deployment.id,
      sequence: deployment.generation,
      visibility: site.previewVisibility,
      expiresAt: null,
    })
  );
}

export async function restoreProductionDeployment(
  site: Site,
  deployment: SiteDeployment
): Promise<ActivationOutcome> {
  if (!(await hasStoredFiles(site, deployment))) {
    return "not_live";
  }
  const { lastGeneration } = await allocateGeneration(db, site.id);
  return liveUnlessSuperseded(
    await activateProductionDeployment(site, {
      deploymentId: deployment.id,
      generation: lastGeneration,
    })
  );
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
