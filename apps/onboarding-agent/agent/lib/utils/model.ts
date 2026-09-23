import { devToolsMiddleware } from "@ai-sdk/devtools";
import { gateway, type LanguageModel, wrapLanguageModel } from "ai";

export function createAgentModel(modelId: string, tag: string): LanguageModel {
  const base = gateway(modelId);
  const tagged = wrapLanguageModel({
    model: base,
    middleware: {
      transformParams: async ({ params }) => ({
        ...params,
        providerOptions: {
          ...params.providerOptions,
          gateway: {
            ...params.providerOptions?.gateway,
            caching: "auto",
            tags: [tag],
          },
        },
      }),
    },
  });
  if (process.env.AI_SDK_DEVTOOLS !== "true") {
    return tagged;
  }

  return wrapLanguageModel({
    model: tagged,
    middleware: devToolsMiddleware(),
  });
}
