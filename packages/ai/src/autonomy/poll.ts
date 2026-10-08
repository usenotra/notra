import type { IrisPollError } from "@notra/ai/autonomy/errors";
import { recordSignals } from "@notra/ai/autonomy/signals";
import {
  IRIS_POLL_LOOKBACK_HOURS,
  IRIS_POLL_SOURCE_CONCURRENCY,
  MILLISECONDS_PER_HOUR,
} from "@notra/ai/constants/autonomy-poll";
import {
  SIGNAL_SOURCE_GITHUB,
  SIGNAL_SOURCE_LINEAR,
} from "@notra/ai/constants/autonomy-signals";
import type {
  IrisPollSourceSummary,
  IrisSourcePollResult,
  PollIrisSourcesInput,
  PollIrisSourcesResult,
} from "@notra/ai/types/autonomy-poll";
import { buildIrisPollDigest } from "@notra/ai/utils/iris-poll-digest";
import { pollGithubSource } from "@notra/ai/utils/iris-poll-github";
import { pollLinearSource } from "@notra/ai/utils/iris-poll-linear";
import { Effect } from "effect";

const recordSourceItems = Effect.fn("iris.poll.record")(function* (
  organizationId: string,
  source: IrisSourcePollResult,
  digest: string
) {
  let recordedCount = 0;
  let deduplicatedCount = 0;

  const results = yield* recordSignals({
    organizationId,
    signals: source.items.map((item) => ({
      source: item.source,
      kind: item.kind,
      sourceEventId: item.sourceEventId,
      occurredAt: item.occurredAt,
      payload: { ...item.payload, digest },
      dedupeHash: item.dedupeHash,
    })),
  });

  for (const result of results) {
    if (result.deduplicated) {
      deduplicatedCount += 1;
    } else {
      recordedCount += 1;
    }
  }

  return {
    source: source.source,
    itemCount: source.items.length,
    recordedCount,
    deduplicatedCount,
    skippedReason: source.skippedReason,
  } satisfies IrisPollSourceSummary;
});

const isolateSourceFailure = (
  source: string,
  effect: Effect.Effect<IrisSourcePollResult, IrisPollError>
): Effect.Effect<IrisSourcePollResult> =>
  effect.pipe(
    Effect.catch((error) =>
      Effect.annotateLogs(Effect.logWarning("iris.poll.sourceFailed"), {
        source,
        message: error.message,
      }).pipe(
        Effect.as({
          source,
          items: [],
          skippedReason: `Polling ${source} failed: ${error.message}`,
        } satisfies IrisSourcePollResult)
      )
    )
  );

export const pollIrisSources = Effect.fn("iris.poll.sources")(function* (
  input: PollIrisSourcesInput
) {
  const lookbackHours = input.lookbackHours ?? IRIS_POLL_LOOKBACK_HOURS;
  const generatedAt = new Date();
  const since = new Date(
    generatedAt.getTime() - lookbackHours * MILLISECONDS_PER_HOUR
  );
  const window = { organizationId: input.organizationId, since };

  const sources = yield* Effect.all(
    [
      isolateSourceFailure(SIGNAL_SOURCE_GITHUB, pollGithubSource(window)),
      isolateSourceFailure(SIGNAL_SOURCE_LINEAR, pollLinearSource(window)),
    ],
    { concurrency: IRIS_POLL_SOURCE_CONCURRENCY }
  );

  const digest = buildIrisPollDigest({ lookbackHours, generatedAt, sources });

  const summaries = yield* Effect.forEach(sources, (source) =>
    recordSourceItems(input.organizationId, source, digest)
  );

  const recordedCount = summaries.reduce(
    (total, summary) => total + summary.recordedCount,
    0
  );
  const deduplicatedCount = summaries.reduce(
    (total, summary) => total + summary.deduplicatedCount,
    0
  );

  yield* Effect.annotateLogs(Effect.logInfo("iris.poll.completed"), {
    organizationId: input.organizationId,
    lookbackHours,
    recordedCount,
    deduplicatedCount,
  });

  return {
    recordedCount,
    deduplicatedCount,
    digest,
    sources: summaries,
  } satisfies PollIrisSourcesResult;
});
