import { randomUUID } from "node:crypto";

import {
  CODE_RESEARCH_BOX_REUSE_MARGIN_SECONDS,
  CODE_RESEARCH_LEASE_POLL_MS,
  CODE_RESEARCH_LEASE_TTL_SECONDS,
  CODE_RESEARCH_LEASE_WAIT_MS,
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

// Without Redis (local dev) boxes are only reused within one process.
const memoryStates = new Map<string, CodeResearchWorkspaceState>();

function stateKey(sessionKey: string, integrationId: string) {
  return `code-research:box:${sessionKey}:${integrationId}`;
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

async function writeState(key: string, state: CodeResearchWorkspaceState) {
  const ttl =
    state.expiresAt - nowSeconds() - CODE_RESEARCH_BOX_REUSE_MARGIN_SECONDS;
  if (ttl <= 0) {
    return;
  }
  if (!redis) {
    memoryStates.set(key, state);
    return;
  }
  await redis.set(key, state, { ex: ttl });
}

async function clearState(key: string) {
  if (!redis) {
    memoryStates.delete(key);
    return;
  }
  await redis.del(key);
}

async function acquireLease(key: string, owner: string) {
  if (!redis) {
    return true;
  }
  const result = await redis.set(key, owner, {
    nx: true,
    ex: CODE_RESEARCH_LEASE_TTL_SECONDS,
  });
  return result === "OK";
}

async function releaseLease(key: string, owner: string) {
  if (!redis) {
    return;
  }
  const current = await redis.get<string>(key);
  if (current === owner) {
    await redis.del(key);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reuseWorkspace(params: {
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
  await writeState(params.key, state);
  return { box, state, reused: true };
}

async function createWorkspace(params: {
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
    token: context.token ?? null,
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
    await writeState(params.key, state);
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
      const reused = await reuseWorkspace({ key, state, target: null });
      if (reused) {
        return reused;
      }
      continue;
    }

    if (await acquireLease(lease, owner)) {
      try {
        const fresh = await readState(key);
        if (fresh && isReusable(fresh)) {
          const reused = await reuseWorkspace({
            key,
            state: fresh,
            target: params.target,
          });
          if (reused) {
            return reused;
          }
        }
        return await createWorkspace({
          key,
          organizationId: params.organizationId,
          integrationId: params.integrationId,
          target: params.target ?? { kind: "default" },
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
