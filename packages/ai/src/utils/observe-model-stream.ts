import type { LanguageModelV3StreamPart } from "@ai-sdk/provider";
import type { ModelCallTelemetry } from "@notra/ai/types/model-call-telemetry";

/** Observes consumption without buffering ahead or changing provider chunks. */
export function observeModelStream(
  stream: ReadableStream<LanguageModelV3StreamPart>,
  telemetry: ModelCallTelemetry
): ReadableStream<LanguageModelV3StreamPart> {
  const reader = stream.getReader();
  let responseId: string | undefined;
  return new ReadableStream<LanguageModelV3StreamPart>(
    {
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            telemetry.incomplete();
            reader.releaseLock();
            controller.close();
            return;
          }
          if (value.type === "response-metadata") {
            responseId = value.id;
          }
          if (
            (value.type === "text-delta" ||
              value.type === "reasoning-delta" ||
              value.type === "tool-input-delta") &&
            value.delta.length > 0
          ) {
            telemetry.firstChunk();
          }
          if (value.type === "error") {
            telemetry.fail(value.error);
          } else if (value.type === "finish") {
            telemetry.complete({ ...value, responseId });
          }
          controller.enqueue(value);
        } catch (error) {
          telemetry.fail(error);
          reader.releaseLock();
          controller.error(error);
        }
      },
      async cancel(reason) {
        telemetry.abort();
        try {
          await reader.cancel(reason);
        } finally {
          reader.releaseLock();
        }
      },
    },
    { highWaterMark: 0 }
  );
}
