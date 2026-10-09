import { verifyGitHubWebhookSignature } from "@notra/ai/utils/github-webhook-signature";
import { db } from "@notra/db/drizzle";
import {
  githubAppInstallations,
  githubIntegrations,
  siteDeployments,
  sites,
  siteWebhookDeliveries,
} from "@notra/db/schema";
import { SITE_DEPLOYMENT_IN_PROGRESS_STATUSES } from "@notra/sites-core/constants/sites";
import {
  branchPreviewKey,
  pullRequestPreviewKey,
} from "@notra/sites-core/utils/hosts";
import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";

import { readLiveDeployments } from "./activation";
import {
  BRANCH_REF_PREFIX,
  PREVIEW_PR_ACTIONS,
  SITES_WEBHOOK_EVENTS,
  WEBHOOK_CLAIM_LEASE_SECONDS,
  ZERO_SHA,
} from "./constants/webhooks";
import {
  enqueuePreviewRemoval,
  enqueueSiteDeployment,
  getDeployment,
} from "./deployments";
import { SiteNotBuildableError } from "./errors";
import type { EnqueueDeploymentInput } from "./types/deployments";
import type {
  CheckRunPayload,
  PullRequestPayload,
  PushPayload,
  SitesWebhookParams,
  SitesWebhookResult,
} from "./types/webhooks";
import { redeploymentInput } from "./utils/deployments";

async function enqueueOrSkip(
  input: EnqueueDeploymentInput
): Promise<string | null> {
  try {
    return (await enqueueSiteDeployment(input)).jobId;
  } catch (error) {
    if (error instanceof SiteNotBuildableError) {
      console.warn("sites.webhook_deploy_skipped", {
        siteId: input.siteId,
        reason: error.message,
      });
      return null;
    }
    throw error;
  }
}

async function isPreviewOpen(
  siteId: string,
  previewKey: string
): Promise<boolean> {
  const live = await readLiveDeployments(siteId);
  if (previewKey in live.previews) {
    return true;
  }
  const [building] = await db
    .select({ id: siteDeployments.id })
    .from(siteDeployments)
    .where(
      and(
        eq(siteDeployments.siteId, siteId),
        eq(siteDeployments.previewKey, previewKey),
        inArray(siteDeployments.status, [
          ...SITE_DEPLOYMENT_IN_PROGRESS_STATUSES,
        ])
      )
    )
    .limit(1);
  return Boolean(building);
}

async function sitesForRepository(
  repositoryId: number,
  installationId: number | undefined
) {
  if (!installationId) {
    return [];
  }
  return await db
    .select({ site: sites })
    .from(sites)
    .innerJoin(
      githubIntegrations,
      and(
        eq(sites.repositoryId, githubIntegrations.id),
        eq(sites.organizationId, githubIntegrations.organizationId),
        eq(sites.githubRepositoryId, githubIntegrations.githubRepositoryId),
        eq(sites.repositoryOwner, githubIntegrations.owner),
        eq(sites.repositoryName, githubIntegrations.repo)
      )
    )
    .innerJoin(
      githubAppInstallations,
      and(
        eq(
          githubIntegrations.githubAppInstallationId,
          githubAppInstallations.id
        ),
        eq(sites.organizationId, githubAppInstallations.organizationId),
        eq(sites.githubInstallationId, githubAppInstallations.installationId)
      )
    )
    .where(
      and(
        eq(sites.githubRepositoryId, String(repositoryId)),
        eq(sites.githubInstallationId, String(installationId)),
        eq(sites.status, "active"),
        eq(githubIntegrations.enabled, true),
        eq(githubIntegrations.repositoryEnabled, true),
        eq(githubAppInstallations.enabled, true)
      )
    )
    .then((rows) => rows.map(({ site }) => site));
}

async function handlePush(payload: PushPayload): Promise<string[]> {
  if (
    !payload.ref.startsWith(BRANCH_REF_PREFIX) ||
    payload.deleted ||
    ZERO_SHA.test(payload.after)
  ) {
    return [];
  }
  const branch = payload.ref.slice(BRANCH_REF_PREFIX.length);
  const commit = {
    trigger: "push",
    branch,
    commitSha: payload.after,
    commitMessage: payload.head_commit?.message?.split("\n")[0] ?? null,
    commitAuthor: payload.head_commit?.author?.name ?? null,
  } as const;
  const jobIds: string[] = [];
  for (const site of await sitesForRepository(
    payload.repository.id,
    payload.installation?.id
  )) {
    const previewKey =
      branch === site.productionBranch
        ? null
        : branchPreviewKey(branch, site.slug);
    if (
      previewKey &&
      !(site.previewsEnabled && (await isPreviewOpen(site.id, previewKey)))
    ) {
      continue;
    }
    const jobId = await enqueueOrSkip({
      ...commit,
      siteId: site.id,
      kind: previewKey ? "preview" : "production",
      previewKey,
    });
    if (jobId) {
      jobIds.push(jobId);
    }
  }
  return jobIds;
}

async function handlePullRequest(
  payload: PullRequestPayload
): Promise<string[]> {
  const previewKey = pullRequestPreviewKey(payload.number);
  const jobIds: string[] = [];
  for (const site of await sitesForRepository(
    payload.repository.id,
    payload.installation?.id
  )) {
    if (payload.action === "closed") {
      jobIds.push(await enqueuePreviewRemoval(site.id, previewKey));
      continue;
    }
    if (!(PREVIEW_PR_ACTIONS.has(payload.action) && site.previewsEnabled)) {
      continue;
    }
    const fromSameRepository =
      payload.pull_request.head.repo?.id === payload.repository.id;
    if (
      payload.pull_request.base.ref !== site.productionBranch ||
      !fromSameRepository
    ) {
      continue;
    }
    const jobId = await enqueueOrSkip({
      siteId: site.id,
      kind: "preview",
      previewKey,
      trigger: "pull_request",
      branch: payload.pull_request.head.ref,
      commitSha: payload.pull_request.head.sha,
      commitMessage: payload.pull_request.title,
      commitAuthor: payload.pull_request.user?.login ?? null,
      pullRequestNumber: payload.number,
    });
    if (jobId) {
      jobIds.push(jobId);
    }
  }
  return jobIds;
}

async function handleCheckRun(payload: CheckRunPayload): Promise<string[]> {
  if (
    payload.action !== "rerequested" ||
    !payload.check_run.external_id?.startsWith("dep_")
  ) {
    return [];
  }
  const previous = await getDeployment(payload.check_run.external_id);
  if (!previous) {
    return [];
  }
  const site = (
    await sitesForRepository(payload.repository.id, payload.installation?.id)
  ).find((candidate) => candidate.id === previous.siteId);
  if (!site) {
    return [];
  }
  const jobId = await enqueueOrSkip(redeploymentInput(previous, null));
  return jobId ? [jobId] : [];
}

export async function handleSitesWebhook(
  params: SitesWebhookParams
): Promise<SitesWebhookResult | null> {
  if (!SITES_WEBHOOK_EVENTS.has(params.event)) {
    return null;
  }
  if (
    !verifyGitHubWebhookSignature(
      params.rawBody,
      params.signature,
      params.secret
    )
  ) {
    return {
      httpStatus: 401,
      body: { error: "Invalid webhook signature" },
      jobIds: [],
    };
  }
  if (!params.deliveryId) {
    return {
      httpStatus: 400,
      body: { error: "Missing X-GitHub-Delivery header" },
      jobIds: [],
    };
  }
  const claimed = await db
    .insert(siteWebhookDeliveries)
    .values({ deliveryId: params.deliveryId, event: params.event })
    .onConflictDoUpdate({
      target: siteWebhookDeliveries.deliveryId,
      set: { receivedAt: sql`now()` },
      setWhere: and(
        isNull(siteWebhookDeliveries.processedAt),
        lt(
          siteWebhookDeliveries.receivedAt,
          sql`now() - make_interval(secs => ${WEBHOOK_CLAIM_LEASE_SECONDS})`
        )
      ),
    })
    .returning({ deliveryId: siteWebhookDeliveries.deliveryId });
  if (claimed.length === 0) {
    return {
      httpStatus: 200,
      body: { message: "duplicate delivery" },
      jobIds: [],
    };
  }
  try {
    const payload = JSON.parse(params.rawBody) as unknown;
    let jobIds: string[] = [];
    if (params.event === "push") {
      jobIds = await handlePush(payload as PushPayload);
    } else if (params.event === "pull_request") {
      jobIds = await handlePullRequest(payload as PullRequestPayload);
    } else if (params.event === "check_run") {
      jobIds = await handleCheckRun(payload as CheckRunPayload);
    }
    await db
      .update(siteWebhookDeliveries)
      .set({ processedAt: new Date() })
      .where(eq(siteWebhookDeliveries.deliveryId, params.deliveryId));
    return {
      httpStatus: 200,
      body: { message: "ok", queued: jobIds.length },
      jobIds,
    };
  } catch (error) {
    await db
      .delete(siteWebhookDeliveries)
      .where(eq(siteWebhookDeliveries.deliveryId, params.deliveryId));
    throw error;
  }
}
