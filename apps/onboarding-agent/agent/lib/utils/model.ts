import { devToolsMiddleware } from "@ai-sdk/devtools";
import { withGatewayAgentOptions } from "@notra/ai/utils/gateway-agent-model";
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
      "step.started": (_event, ctx) => {
        const organizationId = getOrganizationId(ctx);
        const gatewayOptions: Record<string, string> = {};
        if (organizationId) {
          gatewayOptions.user = organizationId;
        }
        return {
          model,
          modelContextWindowTokens,
          modelOptions: {
            providerOptions: {
              gateway: gatewayOptions,
            },
          },
        };
      },
    },
  });
}
