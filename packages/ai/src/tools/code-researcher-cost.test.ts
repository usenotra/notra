import { expect, mock, test } from "bun:test";

import type { AgentTokenUsage } from "@notra/ai/types/agents";

let reportedCost: number | undefined;
const settlement = { usage: undefined as AgentTokenUsage | undefined };
const actualAi = await import("ai");
mock.module("ai", () => ({
  ...actualAi,
  ToolLoopAgent: class {
    async stream() {
      return {
        output: Promise.resolve({ status: "found", feature: "fixture" }),
        fullStream: (async function* () {
          yield {
            type: "finish-step",
            response: { modelId: "anthropic/claude-sonnet-4.6" },
            usage: {
              inputTokens: 1_000,
              outputTokens: 100,
              totalTokens: 1_100,
            },
            providerMetadata: {},
          };
        })(),
      };
    }
  },
}));
mock.module("@notra/ai/gateway", () => ({
  assertRouteHasCredits: async () => {},
  getRouteMetadata: () => ({
    gateway: "vercel",
    model: "anthropic/claude-sonnet-4.6",
  }),
  enrichRouteMetadata: async () => ({
    gateway: "vercel",
    model: "anthropic/claude-sonnet-4.6",
    costUsd: reportedCost,
  }),
}));
mock.module("@notra/ai/model", () => ({ createModel: () => ({}) }));
mock.module("@notra/ai/billing/code-research-billing", () => ({
  trackCodeResearchUsage: async ({
    usage,
  }: Parameters<
    typeof import("@notra/ai/billing/code-research-billing").trackCodeResearchUsage
  >[0]) => {
    settlement.usage = usage;
  },
}));
mock.module("@notra/ai/tools/github", () => ({
  createGetPullRequestsTool: () => ({}),
}));
mock.module("@notra/ai/utils/code-research-actions", () => ({
  listRepositoryFiles() {},
  openRepository() {},
  readRepositoryFile() {},
  repositoryHistory() {},
  searchRepository() {},
  showRepositoryChange() {},
}));
const { createCodeResearcherTool } = await import("./code-researcher");

test.each([0.2, 0, undefined])(
  "code researcher settles reported cost %s or estimates missing cost",
  async (cost) => {
    reportedCost = cost;
    settlement.usage = undefined;
    const research = createCodeResearcherTool({
      organizationId: "org_fixture",
      sessionKey: "fixture",
      allowedIntegrationIds: ["fixture"],
    });
    if (!research.execute) {
      throw new Error("missing execution");
    }
    const output = research.execute(
      { feature: "fixture", integrationId: "fixture" },
      { toolCallId: "fixture", messages: [], context: undefined }
    );
    if (
      !output ||
      typeof output !== "object" ||
      !(Symbol.asyncIterator in output)
    ) {
      throw new Error("missing stream");
    }
    for await (const _ of output) {
      /* Consume the production settlement boundary. */
    }
    const usage = settlement.usage as AgentTokenUsage | undefined;
    expect(usage?.tokenCostUsd).toBeCloseTo(cost ?? 0.0045, 12);
    expect(usage?.totalTokens).toBe(1_100);
  }
);
