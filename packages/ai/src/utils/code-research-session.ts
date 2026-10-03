import { randomUUID } from "node:crypto";

import {
  CODE_RESEARCH_BOX_REUSE_MARGIN_SECONDS,
  CODE_RESEARCH_BOX_TTL_SECONDS,
  CODE_RESEARCH_LEASE_POLL_MS,
  CODE_RESEARCH_LEASE_RENEW_MS,
  CODE_RESEARCH_LEASE_TTL_SECONDS,
  CODE_RESEARCH_LEASE_WAIT_MS,
  CODE_RESEARCH_REPO_LOOKUP_TIMEOUT_MS,
  CODE_RESEARCH_TOKEN_SCOPE,
} from "@notra/ai/constants/code-research";
import { log } from "@notra/ai/evlog";
import { getGitHubToolRepositoryContextByIntegrationId } from "@notra/ai/integrations/github";
import type {
  CodeResearchTarget,
  CodeResearchWorkspace,
  CodeResearchWorkspaceState,
} from "@notra/ai/types/code-research";
import {
  attachCodeResearchBox,
  checkoutTargetInBox,
  cloneRepositoryIntoBox,
  createCodeResearchBox,
  deleteCodeResearchBox,
} from "@notra/ai/utils/code-research-box";
import {
  describeTarget,
  isSameTarget,
} from "@notra/ai/utils/code-research-commands";
import { redis } from "@notra/ai/utils/redis";
import { db } from "@notra/db/drizzle";
import { githubIntegrations } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";

// Without Redis (local dev) boxes are only reused within one process.
const memoryStates = new Map<string, CodeResearchWorkspaceState>();
const memorySessionIndex = new Map<string, Set<string>>();

function stateKey(sessionKey: string, integrationId: string) {
  return `code-research:box:${sessionKey}:${integrationId}`;
}

// Lists a session's state keys, so a finished run can delete its boxes.
function sessionIndexKey(sessionKey: string) {
  return `code-research:session:${sessionKey}`;
}

function leaseKey(sessionKey: string, integrationId: string) {
  return `${stateKey(sessionKey, integrationId)}:lease`;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function isReusable(state: CodeResearchWorkspaceState) {
  return (
    state.expiresAt - nowSeconds() > CODE_RESEARCH_BOX_REUSE_MARGIN_SECONDS
  );
}

async function readState(key: string) {
  if (!redis) {
    return memoryStates.get(key) ?? null;
  }
  return await redis.get<CodeResearchWorkspaceState>(key);
}

async function writeState(
  sessionKey: string,
  key: string,
  state: CodeResearchWorkspaceState
) {
  const ttl =
    state.expiresAt - nowSeconds() - CODE_RESEARCH_BOX_REUSE_MARGIN_SECONDS;
  if (ttl <= 0) {
    return;
  }
  if (!redis) {
    memoryStates.set(key, state);
    const keys = memorySessionIndex.get(sessionKey) ?? new Set<string>();
    keys.add(key);
    memorySessionIndex.set(sessionKey, keys);
    return;
  }
  const indexKey = sessionIndexKey(sessionKey);
  // A full box TTL outlives every state the index points at.
  await redis
    .pipeline()
    .set(key, state, { ex: ttl })
    .sadd(indexKey, key)
    .expire(indexKey, CODE_RESEARCH_BOX_TTL_SECONDS)
    .exec();
}

async function clearState(key: string) {
  if (!redis) {
    memoryStates.delete(key);
    return;
  }
  await redis.del(key);
}

// Without Redis (local dev) leases only guard callers in this process.
const memoryLeases = new Set<string>();

async function acquireLease(key: string, owner: string) {
  if (!redis) {
    if (memoryLeases.has(key)) {
      return false;
    }
    memoryLeases.add(key);
    return true;
  }
  const result = await redis.set(key, owner, {
    nx: true,
    ex: CODE_RESEARCH_LEASE_TTL_SECONDS,
  });
  return result === "OK";
}

// Compare and delete in one step, so an expired holder cannot release the
// lease a later caller has taken over.
const RELEASE_LEASE_SCRIPT = `if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0`;

const RENEW_LEASE_SCRIPT = `if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("expire", KEYS[1], ARGV[2])
end
return 0`;

async function releaseLease(key: string, owner: string) {
  if (!redis) {
    memoryLeases.delete(key);
    return;
  }
  await redis.eval(RELEASE_LEASE_SCRIPT, [key], [owner]);
}

/**
 * Keeps the lease alive while `work` runs. Box creation, clone, and checkout
 * can outlast a fixed TTL, and an expired lease would let a second caller
 * build another box for the same session.
 */
async function withLeaseHeartbeat<T>(
  key: string,
  owner: string,
  work: () => Promise<T>
): Promise<T> {
  const client = redis;
  if (!client) {
    return await work();
  }
  const timer = setInterval(() => {
    client
      .eval(
        RENEW_LEASE_SCRIPT,
        [key],
        [owner, String(CODE_RESEARCH_LEASE_TTL_SECONDS)]
      )
      .catch(() => undefined);
  }, CODE_RESEARCH_LEASE_RENEW_MS);
  try {
    return await work();
  } finally {
    clearInterval(timer);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reuseWorkspace(params: {
  sessionKey: string;
  key: string;
  state: CodeResearchWorkspaceState;
  target: CodeResearchTarget | null;
}): Promise<CodeResearchWorkspace | null> {
  const box = await attachCodeResearchBox(params.state.boxId);
  if (!box) {
    await clearState(params.key);
    return null;
  }
  if (!params.target || isSameTarget(params.target, params.state.target)) {
    return { box, state: params.state, reused: true };
  }
  const headSha = await checkoutTargetInBox(
    box,
    params.target,
    params.state.repository.defaultBranch
  );
  const state = { ...params.state, target: params.target, headSha };
  await writeState(params.sessionKey, params.key, state);
  return { box, state, reused: true };
}

/**
 * Only GitHub App tokens can be narrowed to read-only access on one
 * repository. Personal access tokens carry the user's full scopes, so they
 * never enter a box: public repositories are cloned anonymously instead.
 */
// Returns null when GitHub could not answer, so nothing is stored.
async function lookupRepositoryPrivate(
  repository: { owner: string; repo: string },
  token: string | undefined
): Promise<boolean | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: AbortSignal.timeout(CODE_RESEARCH_REPO_LOOKUP_TIMEOUT_MS),
      }
    );
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as { private?: unknown };
    return typeof body.private === "boolean" ? body.private : null;
  } catch {
    return null;
  }
}

async function resolveBoxToken(
  integrationId: string,
  organizationId: string,
  repository: { owner: string; repo: string },
  contextToken: string | undefined
): Promise<string | null> {
  const [integration] = await db
    .select({
      githubAppInstallationId: githubIntegrations.githubAppInstallationId,
      githubRepositoryPrivate: githubIntegrations.githubRepositoryPrivate,
    })
    .from(githubIntegrations)
    .where(
      and(
        eq(githubIntegrations.id, integrationId),
        eq(githubIntegrations.organizationId, organizationId)
      )
    )
    .limit(1);
  if (integration?.githubAppInstallationId) {
    return contextToken ?? null;
  }
  // Manually connected integrations may lack the flag or hold a stale one,
  // so ask GitHub unless the repository is already known to be public. Only
  // a public answer is stored, so a repository made public later still works.
  let isPrivate = integration?.githubRepositoryPrivate ?? null;
  if (integration && isPrivate !== false) {
    isPrivate = await lookupRepositoryPrivate(repository, contextToken);
    if (isPrivate === false) {
      await db
        .update(githubIntegrations)
        .set({ githubRepositoryPrivate: false })
        .where(eq(githubIntegrations.id, integrationId));
    }
  }
  if (isPrivate === false) {
    return null;
  }
  throw new Error(
    "Code research needs the Notra GitHub App to read private repositories. Reconnect the repository through the GitHub App, then try again."
  );
}

async function createWorkspace(params: {
  sessionKey: string;
  key: string;
  organizationId: string;
  integrationId: string;
  target: CodeResearchTarget;
}): Promise<CodeResearchWorkspace> {
  const context = await getGitHubToolRepositoryContextByIntegrationId(
    params.integrationId,
    {
      organizationId: params.organizationId,
      tokenScope: CODE_RESEARCH_TOKEN_SCOPE,
    }
  );
  const token = await resolveBoxToken(
    params.integrationId,
    params.organizationId,
    context,
    context.token
  );
  const repository = {
    integrationId: context.integrationId,
    organizationId: context.organizationId,
    owner: context.owner,
    repo: context.repo,
    defaultBranch: context.defaultBranch?.trim() || "main",
  };

  const startedAt = Date.now();
  const { box, expiresAt } = await createCodeResearchBox({
    repository,
    token,
  });
  try {
    let headSha = await cloneRepositoryIntoBox(box, repository);
    if (params.target.kind !== "default") {
      headSha = await checkoutTargetInBox(
        box,
        params.target,
        repository.defaultBranch
      );
    }
    const state: CodeResearchWorkspaceState = {
      boxId: box.id,
      repository,
      target: params.target,
      headSha,
      expiresAt,
    };
    await writeState(params.sessionKey, params.key, state);
    log.info({
      event: "code_research.box_ready",
      boxId: box.id,
      organizationId: params.organizationId,
      integrationId: params.integrationId,
      target: describeTarget(params.target),
      durationMs: Date.now() - startedAt,
    });
    return { box, state, reused: false };
  } catch (error) {
    await deleteCodeResearchBox(box);
    throw error;
  }
}

/**
 * Returns a box with the integration's repository checked out at `target`.
 * One box per research session and integration is shared across tool calls
 * and turns; a lease keeps parallel tool calls from each creating a box.
 * With `target` null an existing box keeps whatever it has checked out.
 */
export async function acquireCodeResearchWorkspace(params: {
  sessionKey: string;
  organizationId: string;
  integrationId: string;
  target: CodeResearchTarget | null;
}): Promise<CodeResearchWorkspace> {
  const key = stateKey(params.sessionKey, params.integrationId);
  const lease = leaseKey(params.sessionKey, params.integrationId);
  const owner = randomUUID();
  const deadline = Date.now() + CODE_RESEARCH_LEASE_WAIT_MS;

  while (Date.now() < deadline) {
    const state = await readState(key);
    if (state && state.repository.organizationId !== params.organizationId) {
      throw new Error(
        "Code research workspace belongs to another organization."
      );
    }
    if (state && isReusable(state) && !params.target) {
      const reused = await reuseWorkspace({
        sessionKey: params.sessionKey,
        key,
        state,
        target: null,
      });
      if (reused) {
        return reused;
      }
      continue;
    }

    if (await acquireLease(lease, owner)) {
      try {
        return await withLeaseHeartbeat(lease, owner, async () => {
          const fresh = await readState(key);
          if (fresh && isReusable(fresh)) {
            const reused = await reuseWorkspace({
              sessionKey: params.sessionKey,
              key,
              state: fresh,
              target: params.target,
            });
            if (reused) {
              return reused;
            }
          }
          return await createWorkspace({
            sessionKey: params.sessionKey,
            key,
            organizationId: params.organizationId,
            integrationId: params.integrationId,
            target: params.target ?? { kind: "default" },
          });
        });
      } finally {
        await releaseLease(lease, owner);
      }
    }
    await sleep(CODE_RESEARCH_LEASE_POLL_MS);
  }

  throw new Error(
    "Timed out waiting for the repository sandbox. Try again in a moment."
  );
}

/**
 * Deletes every box a session opened. Runs that cannot get follow-up
 * questions call this when they finish instead of leaving the boxes idle
 * until their TTL.
 */
export async function releaseCodeResearchWorkspaces(
  sessionKey: string
): Promise<void> {
  const indexKey = sessionIndexKey(sessionKey);
  const keys = redis
    ? await redis.smembers(indexKey)
    : [...(memorySessionIndex.get(sessionKey) ?? [])];
  await Promise.all(
    keys.map(async (key) => {
      const state = await readState(key);
      await clearState(key);
      if (!state) {
        return;
      }
      const box = await attachCodeResearchBox(state.boxId).catch(() => null);
      if (box) {
        await deleteCodeResearchBox(box);
      }
      log.info({
        event: "code_research.box_released",
        boxId: state.boxId,
        organizationId: state.repository.organizationId,
        integrationId: state.repository.integrationId,
      });
    })
  );
  if (redis) {
    await redis.del(indexKey);
  } else {
    memorySessionIndex.delete(sessionKey);
  }
}
