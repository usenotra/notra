import { AGENT_DEFAULT_MODEL } from "@notra/ai/constants/models";
import type {
  SandboxRunStore,
  SandboxStream,
  SandboxUsageCallbacks,
} from "@notra/ai/types/github-mention-sandbox-usage";
import { geoBoxTokenUsage } from "@notra/ai/utils/geo-opencode-usage";
import { toAgentTokenUsage } from "@notra/ai/utils/token-usage";
import type { BoxRunData, RunCost } from "@upstash/box";
import { Effect, Schedule } from "effect";

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);
const RECOVERY_SCHEDULE = Schedule.exponential("100 millis").pipe(
  Schedule.upTo({ times: 5 })
);

function isTerminal(run: BoxRunData) {
  return TERMINAL_STATUSES.has(run.status) && run.completed_at !== undefined;
}

function reportUsage(cost: RunCost, onUsage: SandboxUsageCallbacks["onUsage"]) {
  const usage = geoBoxTokenUsage(cost, AGENT_DEFAULT_MODEL);
  onUsage({
    ...toAgentTokenUsage(usage),
    modelId: usage.modelId,
    totalUsd: usage.totalUsd,
    computeMs: usage.computeMs,
  });
}

function recoverRun(
  box: SandboxRunStore,
  runId: string,
  schedule: Schedule.Schedule<unknown, unknown>
) {
  return Effect.tryPromise(() => box.listRuns()).pipe(
    Effect.flatMap((runs) => {
      const run = runs.find((candidate) => candidate.id === runId);
      return run && isTerminal(run)
        ? Effect.succeed(run)
        : Effect.fail(new Error(`Sandbox run ${runId} is not persisted yet`));
    }),
    Effect.retry(schedule),
    Effect.runPromise
  );
}

export async function consumeGitHubMentionSandboxStream(params: {
  box: SandboxRunStore;
  stream: SandboxStream;
  callbacks: SandboxUsageCallbacks;
  recoverySchedule?: Schedule.Schedule<unknown, unknown>;
}) {
  let runId: string | null = null;
  let finished = false;
  let streamError: unknown;

  try {
    for await (const chunk of params.stream) {
      if (chunk.type === "start") {
        runId = chunk.runId;
      }
      if (chunk.type === "finish") {
        finished = true;
      }
    }
  } catch (error) {
    streamError = error;
    await params.stream.cancel().catch(() => undefined);
  }

  if (finished) {
    reportUsage(params.stream.cost, params.callbacks.onUsage);
  } else if (runId) {
    try {
      const run = await recoverRun(
        params.box,
        runId,
        params.recoverySchedule ?? RECOVERY_SCHEDULE
      );
      reportUsage(
        {
          inputTokens: run.input_tokens,
          outputTokens: run.output_tokens,
          cachedInputTokens: run.cached_input_tokens ?? 0,
          totalUsd: run.cost_usd,
          computeMs: run.duration_ms,
        },
        params.callbacks.onUsage
      );
      if (run.status !== "completed") {
        streamError ??= new Error(`Sandbox run ${runId} ${run.status}`);
      }
    } catch (recoveryError) {
      const reason =
        recoveryError instanceof Error
          ? recoveryError.message
          : String(recoveryError);
      params.callbacks.onUsageUnknown({ boxId: params.box.id, runId, reason });
      throw new Error(
        `Sandbox usage is unknown (boxId=${params.box.id}, runId=${runId}): ${reason}`,
        { cause: streamError ?? recoveryError }
      );
    }
  } else {
    const reason = "stream ended before its authoritative start event";
    params.callbacks.onUsageUnknown({
      boxId: params.box.id,
      runId: null,
      reason,
    });
    throw new Error(
      `Sandbox usage is unknown (boxId=${params.box.id}, runId=unknown): ${reason}`,
      { cause: streamError }
    );
  }

  if (streamError) {
    throw streamError;
  }
}
