import { devToolsMiddleware } from "@ai-sdk/devtools";
import { withGatewayAgentOptions } from "@notra/ai/utils/gateway-agent-model";
import { gatewayAttributionOptions } from "@notra/ai/utils/usage-attribution";
import { getOrganizationId } from "@notra/tools/utils/organization";
import { gateway, wrapLanguageModel } from "ai";
import { defineDynamic } from "eve";

export function createAgentModel(
  modelId: string,
  tag: string,
  modelContextWindowTokens: number
) {
  const tagged = withGatewayAgentOptions(gateway(modelId), tag);
  const model =
    process.env.AI_SDK_DEVTOOLS === "true"
      ? wrapLanguageModel({ model: tagged, middleware: devToolsMiddleware() })
      : tagged;
  return defineDynamic({
    fallback: model,
    events: {
      "step.started": (event, ctx) => {
        const organizationId = getOrganizationId(ctx);
        const turnId = (event as { data?: { turnId?: unknown } }).data?.turnId;
        return {
          model,
          modelContextWindowTokens,
          modelOptions: {
            providerOptions: {
              gateway: gatewayAttributionOptions({
                organizationId,
                sessionId: ctx.session.id,
                turnId: typeof turnId === "string" ? turnId : undefined,
              }),
            },
          },
        };
      },
    },
  });
}
