import { db } from "@notra/db/drizzle";
import { SITE_R2_KEYS } from "@notra/sites-core/constants/sites";
import { referencedDeploymentIds } from "@notra/sites-core/utils/serving-state";

import {
  allocateGeneration,
  type Site,
  type SiteDeployment,
} from "./deployments";
import { r2GetText } from "./r2";
import {
  activatePreviewDeployment,
  activateProductionDeployment,
  readServingState,
} from "./state";

/**
 * Points the serving state at a finished deployment. The R2 state is the only
 * record of what is live; nothing is mirrored into the database, so there is
 * no second copy that could disagree after a crash.
 */
export async function activateDeployment(
  site: Site,
  deployment: SiteDeployment
): Promise<"live" | "not_live"> {
  if (deployment.kind === "production") {
    const outcome = await activateProductionDeployment(site, {
      deploymentId: deployment.id,
      generation: deployment.generation,
    });
    return outcome.outcome === "superseded" ? "not_live" : "live";
  }
  if (!deployment.previewKey) {
    throw new Error("Preview deployment without a preview key");
  }
  const outcome = await activatePreviewDeployment(site, deployment.previewKey, {
    deploymentId: deployment.id,
    sequence: deployment.generation,
    visibility: site.previewVisibility,
    expiresAt: null,
  });
  return outcome.outcome === "superseded" ? "not_live" : "live";
}

/**
 * Instant rollback to a stored production deployment. It takes a fresh
 * generation, so builds that were already running cannot override it later.
 */
export async function restoreProductionDeployment(
  site: Site,
  deployment: SiteDeployment
): Promise<"live" | "not_live"> {
  if (!(await r2GetText(SITE_R2_KEYS.manifest(site.id, deployment.id)))) {
    return "not_live";
  }
  const { lastGeneration } = await allocateGeneration(db, site.id);
  const outcome = await activateProductionDeployment(site, {
    deploymentId: deployment.id,
    generation: lastGeneration,
  });
  return outcome.outcome === "superseded" ? "not_live" : "live";
}

/** What the site serves right now: the production deployment and every open preview. */
export async function readLiveDeployments(siteId: string): Promise<{
  productionId: string | null;
  previews: NonNullable<
    Awaited<ReturnType<typeof readServingState>>
  >["state"]["previews"];
  ids: Set<string>;
}> {
  const serving = await readServingState(siteId);
  return {
    productionId: serving?.state.production?.deploymentId ?? null,
    previews: serving?.state.previews ?? {},
    ids: serving ? referencedDeploymentIds(serving.state) : new Set(),
  };
}
