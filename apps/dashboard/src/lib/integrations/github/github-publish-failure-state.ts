import { redis } from "@notra/ai/utils/redis";
import { logWarn } from "@notra/ai/utils/server-log";
import { db } from "@notra/db/drizzle";
import { repositoryOutputs } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";

import {
  AUTOMATED_WORKFLOW_FAILURE_PAUSE_THRESHOLD,
  AUTOMATED_WORKFLOW_FAILURE_STATE_TTL_SECONDS,
} from "@/constants/workflows";

import type {
  ClearGitHubPublishFailuresParams,
  GitHubPublishFailureDependencies,
  GitHubPublishOutputTarget,
  RecordGitHubPublishFailureParams,
} from "../../../types/integrations/github";

const INCREMENT_WITH_TTL_SCRIPT = `local count = redis.call("INCR", KEYS[1])
redis.call("EXPIRE", KEYS[1], ARGV[1])
return count`;

function getGitHubPublishFailureKey(
  organizationId: string,
  repositoryId: string,
  outputType: RecordGitHubPublishFailureParams["outputType"]
) {
  return `github:content-publish:${organizationId}:${repositoryId}:${outputType}:failures`;
}

async function pauseContentOutput(params: GitHubPublishOutputTarget) {
  const pausedOutputs = await db
    .update(repositoryOutputs)
    .set({ enabled: false })
    .where(
      and(
        eq(repositoryOutputs.id, params.outputId),
        eq(repositoryOutputs.repositoryId, params.repositoryId),
        eq(repositoryOutputs.outputType, params.outputType),
        eq(repositoryOutputs.enabled, true)
      )
    )
    .returning({ id: repositoryOutputs.id });

  return pausedOutputs.length > 0;
}

export async function recordGitHubPublishFailure(
  params: RecordGitHubPublishFailureParams,
  dependencies: GitHubPublishFailureDependencies = { redisClient: redis }
) {
  if (!dependencies.redisClient) {
    return { failureCount: 0, paused: false };
  }

  const key = getGitHubPublishFailureKey(
    params.organizationId,
    params.repositoryId,
    params.outputType
  );
  const failureCount = await dependencies.redisClient.eval<[number], number>(
    INCREMENT_WITH_TTL_SCRIPT,
    [key],
    [AUTOMATED_WORKFLOW_FAILURE_STATE_TTL_SECONDS]
  );

  if (failureCount < AUTOMATED_WORKFLOW_FAILURE_PAUSE_THRESHOLD) {
    return { failureCount, paused: false };
  }

  const paused = await (dependencies.pauseOutput ?? pauseContentOutput)({
    outputId: params.outputId,
    outputType: params.outputType,
    repositoryId: params.repositoryId,
  });
  if (paused) {
    try {
      await dependencies.redisClient.del(key);
    } catch (error) {
      logWarn("Failed to clear paused GitHub publish failure state", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { failureCount, paused };
}

export async function clearGitHubPublishFailures(
  params: ClearGitHubPublishFailuresParams,
  dependencies: Pick<GitHubPublishFailureDependencies, "redisClient"> = {
    redisClient: redis,
  }
) {
  if (!dependencies.redisClient) {
    return;
  }

  try {
    await dependencies.redisClient.del(
      getGitHubPublishFailureKey(
        params.organizationId,
        params.repositoryId,
        params.outputType
      )
    );
  } catch (error) {
    logWarn("Failed to clear GitHub publish failure state", {
      ...params,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
