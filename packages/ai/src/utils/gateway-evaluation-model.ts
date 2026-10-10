import type { Experimental_EvaluationModelV4 } from "@ai-sdk/provider";
import type { OperationalContext } from "@notra/ai/types/operational-log";
import { createGatewayCallTelemetry } from "@notra/ai/utils/model-call-telemetry";
import { withUsageAttribution } from "@notra/ai/utils/usage-attribution";

export function withGatewayEvaluationTelemetry(
  model: Experimental_EvaluationModelV4,
  context: Partial<OperationalContext> = {}
): Experimental_EvaluationModelV4 {
  return {
    specificationVersion: model.specificationVersion,
    provider: model.provider,
    modelId: model.modelId,
    supportedQuestionTypes: model.supportedQuestionTypes,
    async doEvaluate(options) {
      const params = {
        ...options,
        providerOptions: withUsageAttribution(options.providerOptions, context),
      };
      const telemetry = createGatewayCallTelemetry(
        model.modelId,
        params,
        "evaluate"
      );
      try {
        const result = await model.doEvaluate(params);
        telemetry.complete({
          usage: {
            inputTokens: {
              total: result.usage?.inputTokens,
              noCache: undefined,
              cacheRead: undefined,
              cacheWrite: undefined,
            },
            outputTokens: {
              total: result.usage?.outputTokens,
              text: undefined,
              reasoning: undefined,
            },
          },
          finishReason: { unified: "stop", raw: undefined },
          responseId: result.response?.id,
          providerMetadata: result.providerMetadata,
        });
        return result;
      } catch (error) {
        telemetry.fail(error);
        throw error;
      }
    },
  };
}
