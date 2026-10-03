import { verifyGitHubWebhookSignature } from "@notra/ai/utils/github-webhook-signature";
import { db } from "@notra/db/drizzle";
import {
  siteDeployments,
  sites,
  siteWebhookDeliveries,
} from "@notra/db/schema";
import { SITE_DEPLOYMENT_IN_PROGRESS_STATUSES } from "@notra/sites-core/constants/sites";
import {
  branchPreviewKey,
  pullRequestPreviewKey,
} from "@notra/sites-core/utils/hosts";
import { and, eq, inArray } from "drizzle-orm";

import { readLiveDeployments } from "./activation";
import {
  type EnqueueDeploymentInput,
  enqueuePreviewRemoval,
  enqueueSiteDeployment,
  getDeployment,
  SiteNotBuildableError,
} from "./deployments";

export const SITES_WEBHOOK_EVENTS = new Set([
  "push",
  "pull_request",
  "check_run",
]);
const ZERO_SHA = /^0+$/;
const PREVIEW_PR_ACTIONS = new Set([
  "opened",
  "reopened",
  "synchronize",
  "ready_for_review",
]);

export interface SitesWebhookResult {
  httpStatus: number;
  body: Record<string, unknown>;
  /** Outbox jobs to dispatch after the response is decided. */
  jobIds: string[];
}

interface RepositoryPayload {
  id: number;
  full_name: string;
}

interface PushPayload {
  ref: string;
  after: string;
  deleted?: boolean;
  repository: RepositoryPayload;
  installation?: { id: number };
  head_commit?: { message?: string; author?: { name?: string } } | null;
}

interface PullRequestPayload {
  action: string;
  number: number;
  repository: RepositoryPayload;
  installation?: { id: number };
  pull_request: {
    head: { sha: string; ref: string; repo: { id: number } | null };
    base: { ref: string };
    title: string;
    user?: { login?: string };
    draft?: boolean;
  };
}

interface CheckRunPayload {
  action: string;
  installation?: { id: number };
  repository: RepositoryPayload;
  check_run: { external_id: string | null; head_sha: string };
}

/** A suspended site or an exhausted quota skips that site instead of failing (and redelivering) the webhook. */
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

/** A branch preview is open while it is served or still building. */
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
    .select()
    .from(sites)
    .where(
      and(
        eq(sites.githubRepositoryId, String(repositoryId)),
        eq(sites.githubInstallationId, String(installationId)),
        eq(sites.status, "active")
      )
    );
}

async function handlePush(payload: PushPayload): Promise<string[]> {
  if (
    !payload.ref.startsWith("refs/heads/") ||
    payload.deleted ||
    ZERO_SHA.test(payload.after)
  ) {
    return [];
  }
  const branch = payload.ref.slice("refs/heads/".length);
  const jobIds: string[] = [];
  for (const site of await sitesForRepository(
    payload.repository.id,
    payload.installation?.id
  )) {
    if (branch === site.productionBranch) {
      const jobId = await enqueueOrSkip({
        siteId: site.id,
        kind: "production",
        previewKey: null,
        trigger: "push",
        branch,
        commitSha: payload.after,
        commitMessage: payload.head_commit?.message?.split("\n")[0] ?? null,
        commitAuthor: payload.head_commit?.author?.name ?? null,
      });
      if (jobId) {
        jobIds.push(jobId);
      }
      continue;
    }
    // Manual branch previews follow their branch: a new commit updates the preview.
    const previewKey = branchPreviewKey(branch, site.slug);
    if (await isPreviewOpen(site.id, previewKey)) {
      const jobId = await enqueueOrSkip({
        siteId: site.id,
        kind: "preview",
        previewKey,
        trigger: "push",
        branch,
        commitSha: payload.after,
        commitMessage: payload.head_commit?.message?.split("\n")[0] ?? null,
        commitAuthor: payload.head_commit?.author?.name ?? null,
      });
      if (jobId) {
        jobIds.push(jobId);
      }
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
    // Like Mintlify: previews for pull requests into the deployment branch, from this repository only.
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
  // Several sites can share a repository; re-run the one this check belongs to.
  const site = (
    await sitesForRepository(payload.repository.id, payload.installation?.id)
  ).find((candidate) => candidate.id === previous.siteId);
  if (!site) {
    return [];
  }
  const jobId = await enqueueOrSkip({
    siteId: site.id,
    kind: previous.kind,
    previewKey: previous.previewKey,
    trigger: "redeploy",
    branch: previous.branch,
    commitSha: previous.commitSha,
    commitMessage: previous.commitMessage,
    commitAuthor: previous.commitAuthor,
    pullRequestNumber: previous.pullRequestNumber,
  });
  return jobId ? [jobId] : [];
}

/**
 * Handles the GitHub App events Sites cares about. The delivery row is the
 * claim: a redelivered webhook is acknowledged without queueing twice, and a
 * failed attempt releases the claim so GitHub's retry can run again.
 */
export async function handleSitesWebhook(params: {
  event: string;
  deliveryId: string | null;
  signature: string | null;
  rawBody: string;
  secret: string;
}): Promise<SitesWebhookResult | null> {
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
    .onConflictDoNothing()
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
