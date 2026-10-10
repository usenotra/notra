import { LOG_PIPELINE_OPTIONS } from "@notra/ai/constants/evlog";
import type { CheckpointLogPipeline } from "@notra/ai/types/evlog";
import type { LogShippingPolicy } from "@notra/ai/types/log-shipping";
import { createCheckpointPipeline } from "@notra/ai/utils/checkpoint-pipeline";
import type { DrainContext } from "evlog";
import type { DrainPipelineOptions } from "evlog/pipeline";

/** Destinations own encoding; this shell owns disablement and safe drop reporting. */
export function createShippingPipeline(
  send: (batch: DrainContext[]) => Promise<void>,
  policy: LogShippingPolicy,
  options: DrainPipelineOptions<DrainContext> = LOG_PIPELINE_OPTIONS
): CheckpointLogPipeline {
  let disabled = false;
  let overflowCount = 0;
  function reportOverflow() {
    if (overflowCount > 0) {
      console.error(
        `[${policy.label}] dropped ${overflowCount} events (buffer overflow)`
      );
      overflowCount = 0;
    }
  }
  const pipeline = createCheckpointPipeline(
    async (batch) => {
      reportOverflow();
      if (disabled) {
        return;
      }
      try {
        await send(batch);
      } catch (error) {
        if (
          !(
            error instanceof Error &&
            policy.permanentErrorPattern.test(error.message)
          )
        ) {
          throw error;
        }
        if (!disabled) {
          disabled = true;
          console.warn(policy.disabledMessage);
        }
      }
      reportOverflow();
    },
    {
      ...options,
      onDropped: (events, error) => {
        if (options.onDropped) {
          options.onDropped(events, error);
        } else if (!error) {
          overflowCount += events.length;
        } else {
          reportOverflow();
          // Transport errors may contain response bodies or credentials.
          console.error(
            `[${policy.label}] dropped ${events.length} events (delivery failed)`
          );
        }
      },
    }
  );
  const push = (ctx: DrainContext) => {
    if (!disabled) {
      pipeline(ctx);
    }
  };
  return Object.defineProperty(
    Object.assign(push, {
      flush(): Promise<void> {
        reportOverflow();
        return pipeline.flush();
      },
    }),
    "pending",
    { get: () => pipeline.pending, enumerable: true }
  ) as CheckpointLogPipeline;
}
