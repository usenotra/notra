import { setTimeout as delay } from "node:timers/promises";

import {
  IMAGE_GEN_MODEL_ID,
  RUN_CANCEL_CONFIRMATION_ATTEMPTS,
  RUN_CANCEL_CONFIRMATION_INTERVAL_MS,
} from "@notra/ai/constants/repo-image";
import type { DiagramSpec } from "@notra/ai/types/excalidraw-diagram";
import type {
  GenerateRepoImageInput,
  RepoImageErrorCode,
  RepoImageRender,
  RepoImageSourceContext,
  RepoImageUsage,
} from "@notra/ai/types/repo-image";
import { extractRepoImageUsage } from "@notra/ai/utils/repo-image-usage";
import { logInfo, logWarn } from "@notra/ai/utils/server-log";
import type { Box } from "@upstash/box";

export type RepoImageBox = Awaited<ReturnType<typeof Box.create>>;

export class RepoImageError extends Error {
  readonly code: RepoImageErrorCode;
  readonly retryable: boolean;

  constructor(
    code: RepoImageErrorCode,
    message: string,
    options?: { retryable?: boolean }
  ) {
    super(message);
    this.name = "RepoImageError";
    this.code = code;
    this.retryable = options?.retryable ?? true;
  }
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/** Everything a format needs once the repository is in the sandbox. */
export interface RepoImageFormatContext {
  box: RepoImageBox;
  input: GenerateRepoImageInput;
  repository: { owner: string; repo: string };
  source: RepoImageSourceContext;
  /** Set when revising: the box was restored from this snapshot. */
  restoreSnapshotId?: string | null;
  /** Latest saved diagram, which can be newer than the restored snapshot. */
  restoreDiagramSpec?: DiagramSpec | null;
}

/**
 * One output format of the image agent. `prepare` runs before the shared
 * brand and humanizer skills are injected, `run` drives the agent until the
 * format's output renders.
 */
export interface RepoImageFormatRunner {
  prepare: (context: RepoImageFormatContext) => Promise<void>;
  run: (context: RepoImageFormatContext) => Promise<RepoImageRender>;
}

function isAgentTimeoutError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("stream timed out") || message.includes("run timed out")
  );
}

async function streamAgent(
  box: RepoImageBox,
  step: { prompt: string; timeout: number; label: string },
  recordCost: (cost: unknown) => void
) {
  const startedAt = Date.now();
  const stream = await box.agent.stream({
    prompt: step.prompt,
    timeout: step.timeout,
    options: {
      reasoningEffort: "high",
    },
  });

  let reportedCost: unknown;
  try {
    for await (const chunk of stream) {
      if (chunk.type === "finish") {
        // The SDK's cost getter is initialized to zero before the done event.
        // Only a provider finish event makes these values reported usage.
        reportedCost = stream.cost;
      }
      if (chunk.type === "tool-call") {
        logInfo("[repo-image] Agent tool call", {
          label: step.label,
          toolName: chunk.toolName,
        });
      }
    }

    logInfo("[repo-image] Agent stream completed", {
      label: step.label,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    if (isAgentTimeoutError(error)) {
      try {
        // Run.cancel() swallows HTTP failures and sets only a local status.
        // Confirm this exact run stopped through the supported backend API.
        await stream.cancel();
        let run = (await box.listRuns()).find(
          (candidate) => candidate.id === stream.id
        );
        for (
          let attempt = 1;
          attempt < RUN_CANCEL_CONFIRMATION_ATTEMPTS &&
          (!run ||
            (run.status !== "cancelled" &&
              run.status !== "completed" &&
              run.status !== "failed"));
          attempt++
        ) {
          await delay(RUN_CANCEL_CONFIRMATION_INTERVAL_MS);
          run = (await box.listRuns()).find(
            (candidate) => candidate.id === stream.id
          );
        }
        if (
          !run ||
          (run.status !== "cancelled" &&
            run.status !== "completed" &&
            run.status !== "failed")
        ) {
          throw new Error("Backend run is not confirmed terminal");
        }
        if (
          reportedCost === undefined &&
          (run.status === "completed" ||
            run.input_tokens > 0 ||
            run.output_tokens > 0 ||
            (run.cached_input_tokens ?? 0) > 0 ||
            run.cost_usd > 0)
        ) {
          reportedCost = {
            inputTokens: run.input_tokens,
            outputTokens: run.output_tokens,
            cachedInputTokens: run.cached_input_tokens,
            computeMs: run.duration_ms,
            totalUsd: run.cost_usd,
          };
        }
      } catch (cancelError) {
        logWarn("[repo-image] Run cancellation could not be confirmed", {
          runId: stream.id,
          error: getErrorMessage(cancelError),
        });
        throw new RepoImageError(
          "agent_failed",
          "Cancellation of the timed-out image agent could not be confirmed; recovery was not started.",
          { retryable: false }
        );
      }
    }
    throw error;
  } finally {
    // Unknown usage must stay undefined, not create a zero-token minimum bill.
    recordCost(reportedCost);
  }
}

export function mergeRepoImageUsage(
  current: RepoImageUsage,
  next: RepoImageUsage
): RepoImageUsage {
  if (!current) {
    return next;
  }
  if (!next) {
    return current;
  }
  return {
    inputTokens: current.inputTokens + next.inputTokens,
    outputTokens: current.outputTokens + next.outputTokens,
    totalTokens: current.totalTokens + next.totalTokens,
    cacheReadTokens: current.cacheReadTokens + next.cacheReadTokens,
    cacheWriteTokens: current.cacheWriteTokens + next.cacheWriteTokens,
    modelId: current.modelId ?? next.modelId,
    computeMs:
      current.computeMs === undefined && next.computeMs === undefined
        ? undefined
        : (current.computeMs ?? 0) + (next.computeMs ?? 0),
    totalUsd:
      current.totalUsd === undefined && next.totalUsd === undefined
        ? undefined
        : (current.totalUsd ?? 0) + (next.totalUsd ?? 0),
    raw: [current.raw, next.raw],
  };
}

/**
 * Runs agent turns in one box and adds up what they cost. A turn with
 * `allowTimeout` that runs out of time is not an error: the caller checks
 * the box for output afterwards.
 */
export function createAgentSession(box: RepoImageBox) {
  let usage: RepoImageUsage;
  return {
    async run(step: {
      prompt: string;
      timeout: number;
      label: string;
      allowTimeout?: boolean;
    }) {
      try {
        await streamAgent(box, step, (cost) => {
          usage = mergeRepoImageUsage(
            usage,
            extractRepoImageUsage(cost, IMAGE_GEN_MODEL_ID)
          );
        });
      } catch (error) {
        if (!(step.allowTimeout && isAgentTimeoutError(error))) {
          throw error;
        }
        logWarn("[repo-image] Agent stream timed out; checking for output", {
          label: step.label,
          timeoutMs: step.timeout,
        });
        return;
      }
    },
    get usage() {
      return usage;
    },
  };
}
