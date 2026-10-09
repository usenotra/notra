import { getEvaluationClient } from "@notra/ai/evaluation/client";
import {
  createOctokit,
  GITHUB_INTERACTIVE_READ_TIMEOUT_MS,
} from "@notra/ai/utils/octokit";
import { siteDeployments, sites } from "@notra/db/schema";
import type { SiteServingState } from "@notra/sites-core/types/deployment";
import { fingerprintSiteInputs } from "@notra/sites-core/utils/input-fingerprint";
import { stableStringify } from "@notra/sites-core/utils/stable-stringify";
import { and, eq } from "drizzle-orm";

import {
  SMART_DEPLOYMENT_QUESTIONS,
  SMART_DEPLOYMENT_SKIP_REASON,
} from "./constants/smart-deployments";
import { getDeployment, transitionDeployment } from "./deployments";
import { getSitesBuilderSnapshotId } from "./env";
import { mutateServingState, readServingState } from "./state";
import type { SiteDeployment } from "./types/deployments";
import type { SiteRepositoryAccess } from "./types/github";
import type { Site } from "./types/sites";
import type { SmartDeploymentComparison } from "./types/smart-deployments";
import { errorMessage } from "./utils/errors";
import { withSiteStorageLock } from "./utils/site-storage-lock";
import { buildTargetForDeployment } from "./utils/urls";

function servingBaseline(state: SiteServingState, deployment: SiteDeployment) {
  if (deployment.kind === "production") {
    return state.production
      ? {
          deploymentId: state.production.deploymentId,
          generation: state.production.generation,
        }
      : null;
  }
  const pointer = deployment.previewKey
    ? state.previews[deployment.previewKey]
    : null;
  return pointer &&
    (!pointer.expiresAt || Date.parse(pointer.expiresAt) > Date.now())
    ? { deploymentId: pointer.deploymentId, generation: pointer.sequence }
    : null;
}

/** All GitHub and model work happens before acquiring the serving-state lock. */
export async function compareSmartDeployment(
  site: Site,
  deployment: SiteDeployment,
  access: SiteRepositoryAccess
): Promise<SmartDeploymentComparison | null> {
  if (!site.smartDeployments) {
    return null;
  }
  try {
    const snapshotId = getSitesBuilderSnapshotId();
    const year = new Date().getUTCFullYear();
    const { data } = await createOctokit(access.token, {
      requestTimeoutMs: GITHUB_INTERACTIVE_READ_TIMEOUT_MS,
    }).request("GET /repos/{owner}/{repo}/git/trees/{tree_sha}", {
      owner: access.repository.owner,
      repo: access.repository.repo,
      tree_sha: deployment.commitSha,
      recursive: "1",
    });
    const fingerprint = await fingerprintSiteInputs({
      tree: data.tree,
      truncated: data.truncated,
      rootDirectory: site.rootDirectory,
      repositoryId: `${site.githubRepositoryId}:${access.repository.owner}/${access.repository.repo}`,
      target: deployment.target,
      includeDrafts: deployment.kind === "preview",
      snapshotId,
      year,
    });
    const comparison: SmartDeploymentComparison = {
      fingerprint,
      snapshotId,
      year,
      baseline: null,
      evaluation: null,
    };
    if (
      !fingerprint ||
      deployment.status !== "queued" ||
      !["push", "pull_request"].includes(deployment.trigger)
    ) {
      return comparison;
    }
    const serving = await readServingState(site.id);
    const baseline =
      serving?.state.status === "active"
        ? servingBaseline(serving.state, deployment)
        : null;
    const published = baseline
      ? await getDeployment(baseline.deploymentId)
      : null;
    if (
      !baseline ||
      published?.status !== "ready" ||
      published.siteId !== site.id ||
      published.kind !== deployment.kind ||
      published.previewKey !== deployment.previewKey ||
      !published.inputFingerprint
    ) {
      return comparison;
    }
    comparison.baseline = baseline;
    const inputsChanged = fingerprint !== published.inputFingerprint;
    const result = await getEvaluationClient().tryEvaluate({
      feature: "sites-smart-deployments",
      organizationId: site.organizationId,
      state: {
        verifiedInputsChanged: inputsChanged,
        comparisonComplete: true,
        scope: deployment.kind,
      },
      questions: SMART_DEPLOYMENT_QUESTIONS,
    });
    comparison.evaluation = {
      comparedDeploymentId: published.id,
      inputsChanged,
      changeProbability: result?.answers.inputs_changed.probability ?? null,
      modelId: result?.modelId ?? null,
    };
    return comparison;
  } catch (error) {
    console.warn(
      "sites.smart_deployment_comparison_failed",
      errorMessage(error)
    );
    return null;
  }
}

/** CAS advances the generation while preserving the files currently being served. */
export async function skipUnchangedDeployment(
  site: Site,
  deployment: SiteDeployment,
  comparison: SmartDeploymentComparison | null
): Promise<boolean> {
  if (
    !comparison?.fingerprint ||
    !comparison.baseline ||
    !comparison.evaluation ||
    comparison.evaluation.inputsChanged
  ) {
    return false;
  }
  const baseline = comparison.baseline;
  return withSiteStorageLock(site.id, async (tx) => {
    const [currentSite] = await tx
      .select()
      .from(sites)
      .where(eq(sites.id, site.id))
      .for("update");
    const [current] = await tx
      .select()
      .from(siteDeployments)
      .where(
        and(
          eq(siteDeployments.id, deployment.id),
          eq(siteDeployments.siteId, site.id)
        )
      )
      .for("update");
    if (
      !currentSite?.smartDeployments ||
      currentSite.status !== "active" ||
      current?.status !== "queued" ||
      !["push", "pull_request"].includes(current.trigger) ||
      (current.kind === "preview" && !currentSite.previewsEnabled) ||
      currentSite.rootDirectory !== site.rootDirectory ||
      currentSite.githubRepositoryId !== site.githubRepositoryId ||
      currentSite.repositoryId !== site.repositoryId ||
      currentSite.repositoryOwner !== site.repositoryOwner ||
      currentSite.repositoryName !== site.repositoryName ||
      currentSite.githubInstallationId !== site.githubInstallationId ||
      comparison.snapshotId !== getSitesBuilderSnapshotId() ||
      comparison.year !== new Date().getUTCFullYear() ||
      stableStringify(current.target) !==
        stableStringify(
          buildTargetForDeployment({
            site: currentSite,
            kind: current.kind,
            previewKey: current.previewKey,
          })
        )
    ) {
      return false;
    }
    const [published] = await tx
      .select()
      .from(siteDeployments)
      .where(
        and(
          eq(siteDeployments.id, baseline.deploymentId),
          eq(siteDeployments.siteId, site.id)
        )
      )
      .limit(1);
    if (
      published?.status !== "ready" ||
      published.inputFingerprint !== comparison.fingerprint
    ) {
      return false;
    }
    const fenced = await mutateServingState(
      currentSite,
      (state) => {
        const live = servingBaseline(state, current);
        if (
          state.status !== "active" ||
          !live ||
          live.deploymentId !== baseline.deploymentId ||
          live.generation !== baseline.generation ||
          live.generation > current.generation
        ) {
          return { skip: true, result: false };
        }
        if (live.generation === current.generation) {
          return { skip: true, result: true };
        }
        const now = new Date().toISOString();
        if (current.kind === "production" && state.production) {
          return {
            write: {
              ...state,
              production: {
                ...state.production,
                generation: current.generation,
              },
              updatedAt: now,
            },
            result: true,
          };
        }
        const key = current.previewKey;
        const pointer = key ? state.previews[key] : null;
        return key && pointer
          ? {
              write: {
                ...state,
                previews: {
                  ...state.previews,
                  [key]: { ...pointer, sequence: current.generation },
                },
                updatedAt: now,
              },
              result: true,
            }
          : { skip: true, result: false };
      },
      tx
    );
    return (
      fenced &&
      transitionDeployment(
        current.id,
        "skipped",
        {
          inputFingerprint: comparison.fingerprint,
          smartDeploymentEvaluation: comparison.evaluation,
          skipReason: SMART_DEPLOYMENT_SKIP_REASON,
          finishedAt: new Date(),
        },
        tx
      )
    );
  });
}
