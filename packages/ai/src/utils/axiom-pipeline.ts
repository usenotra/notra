import { LOG_PIPELINE_OPTIONS } from "@notra/ai/constants/evlog";
import type {
  LogFlushCheckpoint,
  SequencedDrainContext,
} from "@notra/ai/types/evlog";
import type { DrainContext } from "evlog";
import { type AxiomConfig, sendBatchToAxiom } from "evlog/axiom";
import { createDrainPipeline, type DrainPipelineOptions } from "evlog/pipeline";

export function createAxiomPipeline(
  config: AxiomConfig,
  options: DrainPipelineOptions<DrainContext> = LOG_PIPELINE_OPTIONS
) {
  let sequence = 0;
  let pumping = false;
  let overflowCount = 0;
  const pending = new Set<number>();
  const checkpoints = new Map<number, LogFlushCheckpoint>();

  function reportOverflow() {
    if (overflowCount === 0) {
      return;
    }
    console.error(
      `[evlog/${config.dataset}] dropped ${overflowCount} events (buffer overflow)`
    );
    overflowCount = 0;
  }

  function settle(batch: SequencedDrainContext[]) {
    for (const entry of batch) {
      pending.delete(entry.sequence);
    }
    if (checkpoints.size === 0) {
      return;
    }
    const firstPending = pending.values().next().value ?? sequence + 1;
    for (const [target, checkpoint] of checkpoints) {
      if (target < firstPending) {
        checkpoints.delete(target);
        checkpoint.resolve();
      }
    }
  }

  const pipeline = createDrainPipeline<SequencedDrainContext>({
    ...options,
    onDropped: (events, error) => {
      settle(events);
      if (options.onDropped) {
        options.onDropped(events, error);
      } else if (!error) {
        // Count on the hot path; report once at the next delivery boundary
        // instead of writing to stderr for every overflowing request.
        overflowCount += events.length;
      } else {
        reportOverflow();
        console.error(
          `[evlog/${config.dataset}] dropped ${events.length} events`,
          error
        );
      }
    },
  })(async (batch) => {
    // A full batch is dispatched synchronously by evlog.push(). Yield before
    // JSON serialization and fetch so enqueueing does not do batch-sized work.
    // setTimeout(0) instead of setImmediate: Next traces this file as Edge.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    reportOverflow();
    // evlog 2.13's createAxiomDrain swallows send errors. The throwing batch
    // API lets the pipeline own retries and report exhausted deliveries.
    await sendBatchToAxiom(
      batch.map(({ event }) => event),
      { ...config, retries: 0 }
    );
    reportOverflow();
    settle(batch);
  });

  function pump() {
    if (pumping) {
      return;
    }
    pumping = true;
    // The 2.13 pump can consume newly arriving batches indefinitely. Only
    // checkpoints, not this pump promise, are awaited by request lifecycles.
    void pipeline
      .flush()
      .catch((error) => {
        console.error(`[evlog/${config.dataset}] flush pump failed`, error);
      })
      .finally(() => {
        pumping = false;
        if (checkpoints.size > 0) {
          pump();
        }
      });
  }

  const push = (ctx: DrainContext) => {
    sequence += 1;
    pending.add(sequence);
    pipeline({ ...ctx, sequence });
  };

  return Object.assign(push, {
    flush(): Promise<void> {
      if (pending.size === 0) {
        reportOverflow();
        return Promise.resolve();
      }
      const target = sequence;
      const existing = checkpoints.get(target);
      if (existing) {
        return existing.promise;
      }
      let resolve!: () => void;
      const promise = new Promise<void>((complete) => {
        resolve = complete;
      });
      const checkpoint = { promise, resolve };
      checkpoints.set(target, checkpoint);
      pump();
      return checkpoint.promise;
    },
  });
}
