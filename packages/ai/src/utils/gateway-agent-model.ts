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
        providerOptions: {
          ...params.providerOptions,
          gateway: {
            ...params.providerOptions?.gateway,
            caching: "auto",
            tags: [tag],
            ...(model.modelId === "openai/gpt-6-sol" &&
            (tag === "content-writer-agent" || tag === "agent-task")
              ? { serviceTier: "flex" }
              : {}),
          },
        },
      }),
    },
  });
}
