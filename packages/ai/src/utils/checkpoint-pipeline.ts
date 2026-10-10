import type {
  CheckpointLogPipeline,
  LogFlushCheckpoint,
  SequencedDrainContext,
} from "@notra/ai/types/evlog";
import type { DrainContext } from "evlog";
import { createDrainPipeline, type DrainPipelineOptions } from "evlog/pipeline";

/** Reuse evlog batching/retries, but flush only events present at invocation. */
export function createCheckpointPipeline(
  send: (batch: DrainContext[]) => Promise<void>,
  options: DrainPipelineOptions<DrainContext>
): CheckpointLogPipeline {
  let sequence = 0;
  let pumping = false;
  const pending = new Set<number>();
  const checkpoints = new Map<number, LogFlushCheckpoint>();

  function settle(batch: SequencedDrainContext[]) {
    for (const entry of batch) {
      pending.delete(entry.sequence);
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
      options.onDropped?.(events, error);
    },
  })(async (batch) => {
    // A full batch starts synchronously in push(). Keep shipping off that path.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await send(batch);
    settle(batch);
  });

  function pump() {
    if (pumping) {
      return;
    }
    pumping = true;
    // New arrivals may keep evlog's pump busy; lifecycles await checkpoints only.
    void pipeline
      .flush()
      .catch(() => console.error("[evlog] checkpoint flush pump failed"))
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

  const drain = Object.assign(push, {
    flush(): Promise<void> {
      if (pending.size === 0) {
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
      checkpoints.set(target, { promise, resolve });
      pump();
      return promise;
    },
  });
  return Object.defineProperty(drain, "pending", {
    get: () => pending.size,
    enumerable: true,
  }) as CheckpointLogPipeline;
}
