import { devToolsMiddleware } from "@ai-sdk/devtools";
import { withGatewayAgentOptions } from "@notra/ai/utils/gateway-agent-model";
import { gateway, type LanguageModel, wrapLanguageModel } from "ai";

export function createAgentModel(modelId: string, tag: string): LanguageModel {
  const tagged = withGatewayAgentOptions(gateway(modelId), tag);
  if (process.env.AI_SDK_DEVTOOLS !== "true") {
    return tagged;
  }

  return wrapLanguageModel({
    model: tagged,
    middleware: devToolsMiddleware(),
  });
}
