import { createGatewayCallTelemetry } from "@notra/ai/utils/model-call-telemetry";
import { observeModelStream } from "@notra/ai/utils/observe-model-stream";
import { withUsageAttribution } from "@notra/ai/utils/usage-attribution";
import { wrapLanguageModel } from "ai";

export function withGatewayAgentOptions(
  model: Parameters<typeof wrapLanguageModel>[0]["model"],
  tag: string
): ReturnType<typeof wrapLanguageModel> {
  return wrapLanguageModel({
    model,
    middleware: {
      transformParams: async ({ params }) => ({
        ...params,
        providerOptions: withUsageAttribution({
          ...params.providerOptions,
          gateway: {
            ...params.providerOptions?.gateway,
            caching: "auto",
            tags: [
              tag,
              ...(Array.isArray(params.providerOptions?.gateway?.tags)
                ? params.providerOptions.gateway.tags.filter(
                    (value) =>
                      typeof value === "string" &&
                      !value.startsWith("feature:") &&
                      !value.startsWith("attribution:")
                  )
                : []),
            ],
            ...(model.modelId === "openai/gpt-6-sol" &&
            (tag === "content-writer-agent" || tag === "agent-task")
              ? { serviceTier: "flex" }
              : {}),
          },
        }),
      }),
      wrapGenerate: async ({ doGenerate, params }) => {
        const telemetry = createGatewayCallTelemetry(
          model.modelId,
          params,
          "generate"
        );
        try {
          telemetry.attempt();
          const result = await doGenerate();
          telemetry.complete({
            ...result,
            responseId: result.response?.id,
          });
          return result;
        } catch (error) {
          telemetry.fail(error);
          throw error;
        }
      },
      wrapStream: async ({ doStream, params }) => {
        const telemetry = createGatewayCallTelemetry(
          model.modelId,
          params,
          "stream"
        );
        try {
          telemetry.attempt();
          const result = await doStream();
          return {
            ...result,
            stream: observeModelStream(result.stream, telemetry),
          };
        } catch (error) {
          telemetry.fail(error);
          throw error;
        }
      },
    },
  });
}
