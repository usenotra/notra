import { REQUEST_AI_USAGE_FIELDS } from "@notra/ai/constants/evlog";
import { ROUTED_MODEL_PROVIDER } from "@notra/ai/constants/router";
import { getOpenRequestLogger } from "@notra/ai/utils/evlog-request";
import { isRecord } from "@notra/ai/utils/unknown-record";
import { createAILogger } from "evlog/ai";

export type AILogTarget = Parameters<typeof createAILogger>[0];

export function wrapModelWithObservability<T>(model: T, log?: AILogTarget): T {
  if (!log) {
    return model;
  }

  // The router owns request-wide usage; evlog's model-local accumulator adds
  // rich timing and tool details without replacing those counters.
  const target: AILogTarget =
    isRecord(model) && model.provider === ROUTED_MODEL_PROVIDER
      ? {
          ...log,
          set({ ai, ...fields }) {
            log.set({
              ...fields,
              ai:
                log === getOpenRequestLogger() && isRecord(ai)
                  ? Object.fromEntries(
                      Object.entries(ai).filter(
                        ([key]) => !REQUEST_AI_USAGE_FIELDS.has(key)
                      )
                    )
                  : ai,
            });
          },
        }
      : log;
  return createAILogger(target).wrap(model as never) as T;
}
