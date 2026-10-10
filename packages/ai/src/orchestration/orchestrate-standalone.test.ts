import {
  afterAll,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";

import type { LanguageModelV4CallOptions } from "@ai-sdk/provider";
import {
  asSchema,
  generateText,
  InvalidToolInputError,
  NoSuchToolError,
  Output,
  type streamText,
  tool,
  type ToolCallRepairFunction,
  type ToolSet,
} from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { z } from "zod";

const sdk = await import("ai");
let streamOptions: Parameters<typeof streamText>[0] | undefined;
const models: MockLanguageModelV4[] = [];
const requestedModels: string[] = [];
const memoryRequests: string[] = [];
let onGenerate: ((options: LanguageModelV4CallOptions) => void) | undefined;

const markdown = Array.from(
  { length: 300 },
  (_, index) =>
    `Paragraph ${index + 1}: Customers can publish their verified product updates with consistent voice and exact internal links.`
).join("\n");
const repairedInput = { text: markdown, limit: 5 };
let responseText = JSON.stringify(repairedInput);
const brokenInput = JSON.stringify({ ...repairedInput, limit: "5" });
const repairTool = tool({
  inputSchema: z.object({ text: z.string(), limit: z.number().int() }),
});
const repairOptions = {
  toolCall: {
    type: "tool-call",
    toolCallId: "fixture-call",
    toolName: "fixtureTool",
    input: brokenInput,
  },
  tools: { fixtureTool: repairTool },
  inputSchema: async () => await asSchema(repairTool.inputSchema).jsonSchema,
  error: new InvalidToolInputError({
    toolName: "fixtureTool",
    toolInput: brokenInput,
    cause: new Error("limit must be a number"),
  }),
  instructions: undefined,
  system: undefined,
  messages: [],
} satisfies Parameters<ToolCallRepairFunction<ToolSet>>[0];

// Keep the real createModel, SDK generation, output validation, and memory
// wrapper. Only the provider and unrelated orchestration infrastructure are fake.
mock.module("ai", () => ({
  ...sdk,
  streamText: (options: Parameters<typeof streamText>[0]) => {
    streamOptions = options;
    return {};
  },
}));
mock.module("@notra/ai/gateway", () => ({
  gateway: (modelId: string) => {
    requestedModels.push(modelId);
    const model = new MockLanguageModelV4({
      modelId,
      doGenerate: (options) => {
        onGenerate?.(options);
        return Promise.resolve({
          content: [{ type: "text", text: responseText }],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 1, text: 1, reasoning: 0 },
          },
          warnings: [],
        });
      },
    });
    models.push(model);
    return model;
  },
}));
mock.module("@notra/ai/observability", () => ({
  wrapModelWithObservability: (model: MockLanguageModelV4) => model,
}));
mock.module("@notra/ai/utils/server-log", () => ({
  logError: () => {},
  logInfo: () => {},
  logWarn: () => {},
}));
mock.module("@notra/ai/utils/route-usage", () => ({
  summarizeRouteUsage: () => Promise.resolve({}),
}));
mock.module("@notra/ai/integrations/mcp-tool-index", () => ({
  getEnabledMcpServerCount: () => Promise.resolve(0),
}));
mock.module("@notra/ai/skills/functions/service", () => ({
  listSkillSummaries: () => Promise.resolve([]),
}));
mock.module("@notra/ai/utils/chat-workspace", () => ({
  loadChatWorkspace: () => Promise.resolve(null),
  sanitizeChatWorkspaceLabel: (value: string) => value,
}));
mock.module("@notra/ai/tools/mcp-lazy", () => ({
  createLazyMcpRuntime: () => {
    throw new Error("No MCP servers are configured in this fixture");
  },
}));
mock.module("@notra/ai/utils/tool-approval-secret", () => ({
  getToolApprovalSecret: () => "fixture-secret",
}));
mock.module("./router", () => ({
  routeMessage: () => {
    throw new Error("Explicit models must bypass routing");
  },
  selectAutoModel: () => {
    throw new Error("Explicit models must bypass routing");
  },
}));
mock.module("./standalone-tool-registry", () => ({
  buildStandaloneToolSet: () => ({
    tools: repairOptions.tools,
    descriptions: [],
  }),
  getLinearContextFromIntegrations: () => [],
  getRepoContextFromIntegrations: () => [],
  getStandaloneApprovalToolNames: () => new Set(),
}));

const { orchestrateStandaloneChat } = await import("./orchestrate-standalone");
const originalMemoryKey = process.env.SUPERMEMORY_API_KEY;
const originalDevtools = process.env.AI_SDK_DEVTOOLS;
const fetchMock = spyOn(globalThis, "fetch").mockImplementation((input) => {
  const url = input instanceof Request ? input.url : String(input);
  // Never delegate to real fetch, even if a dependency uses an unexpected URL.
  expect([
    "https://api.supermemory.ai/v4/profile",
    "https://api.supermemory.ai/v4/conversations",
  ]).toContain(url);
  memoryRequests.push(url);
  return Promise.resolve(
    new Response(
      JSON.stringify(
        url.endsWith("/profile")
          ? {
              profile: { static: ["Use the company voice."], dynamic: [] },
              searchResults: { results: [] },
            }
          : { id: "offline-save" }
      ),
      { headers: { "content-type": "application/json" } }
    )
  );
});

beforeEach(() => {
  process.env.SUPERMEMORY_API_KEY = "offline-fake-key";
  process.env.AI_SDK_DEVTOOLS = "false";
  models.length = 0;
  requestedModels.length = 0;
  memoryRequests.length = 0;
  streamOptions = undefined;
  onGenerate = undefined;
  responseText = JSON.stringify(repairedInput);
});
afterAll(() => {
  fetchMock.mockRestore();
  if (originalMemoryKey === undefined) {
    delete process.env.SUPERMEMORY_API_KEY;
  } else {
    process.env.SUPERMEMORY_API_KEY = originalMemoryKey;
  }
  if (originalDevtools === undefined) {
    delete process.env.AI_SDK_DEVTOOLS;
  } else {
    process.env.AI_SDK_DEVTOOLS = originalDevtools;
  }
});

async function prepareRepair(
  requestedModel = "anthropic/claude-opus-5.5",
  abortSignal?: AbortSignal
) {
  const result = await orchestrateStandaloneChat({
    organizationId: "synthetic-org",
    chatId: "synthetic-chat",
    messages: [
      {
        id: "user-1",
        role: "user",
        parts: [{ type: "text", text: "Edit it." }],
      },
    ],
    requestedModel,
    abortSignal,
  });
  expect(result.routingDecision.model).toBe(requestedModel);
  const repair = streamOptions?.repairToolCall;
  if (!repair) {
    throw new Error("Production orchestration did not register tool repair");
  }
  return repair;
}

describe("standalone tool repair", () => {
  test.each(["anthropic/claude-opus-5.5", "openai/gpt-6-sol"])(
    "keeps the selected %s model and opaque content, without memory HTTP",
    async (selectedModel) => {
      const controller = new AbortController();
      const repair = await prepareRepair(selectedModel, controller.signal);
      const sample = {
        ...repairedInput,
        text: `${markdown}\n"Quoted" text, backslash \\, and 日本語.`,
      };
      responseText = JSON.stringify(sample);
      const input = JSON.stringify({ ...sample, limit: "5" });
      const result = await repair({
        ...repairOptions,
        toolCall: { ...repairOptions.toolCall, input },
      });
      expect(result).toEqual({
        ...repairOptions.toolCall,
        input: JSON.stringify(sample),
      });
      expect(requestedModels).toEqual([selectedModel, selectedModel]);
      expect(memoryRequests).toEqual([]);
      const call = models[1]?.doGenerateCalls[0];
      expect(call?.abortSignal).toBe(controller.signal);
      expect(call?.providerOptions?.gateway?.tags).toEqual([
        "standalone-chat-tool-repair",
      ]);
      expect(JSON.stringify(call?.prompt)).not.toContain("company voice");
      const userPrompt = call?.prompt.find(
        (message) => message.role === "user"
      );
      expect(userPrompt?.content).toEqual([
        expect.objectContaining({
          text: expect.stringContaining(`\n${input}\n`),
        }),
      ]);
    }
  );

  test("does not generate or fetch a schema when already cancelled", async () => {
    const controller = new AbortController();
    const repair = await prepareRepair(undefined, controller.signal);
    controller.abort();
    const inputSchema = mock(repairOptions.inputSchema);
    expect(await repair({ ...repairOptions, inputSchema })).toBeNull();
    expect(inputSchema).not.toHaveBeenCalled();
    expect(models).toHaveLength(1);
    expect(models[0]?.doGenerateCalls).toHaveLength(0);
    expect(memoryRequests).toEqual([]);
  });

  test("checks cancellation again after asynchronous schema resolution", async () => {
    const controller = new AbortController();
    const repair = await prepareRepair(undefined, controller.signal);
    expect(
      await repair({
        ...repairOptions,
        inputSchema: () => {
          controller.abort();
          return repairOptions.inputSchema();
        },
      })
    ).toBeNull();
    expect(models).toHaveLength(1);
    expect(memoryRequests).toEqual([]);
  });

  test("propagates in-flight cancellation to the provider", async () => {
    const controller = new AbortController();
    const repair = await prepareRepair(undefined, controller.signal);
    onGenerate = (options) => {
      controller.abort();
      expect(options.abortSignal?.aborted).toBe(true);
      options.abortSignal?.throwIfAborted();
    };
    expect(await repair(repairOptions)).toBeNull();
    expect(models[1]?.doGenerateCalls).toHaveLength(1);
    expect(memoryRequests).toEqual([]);
  });

  test("does not generate for unavailable tools or unknown tool names", async () => {
    const repair = await prepareRepair();
    expect(await repair({ ...repairOptions, tools: {} })).toBeNull();
    expect(
      await repair({
        ...repairOptions,
        error: new NoSuchToolError({ toolName: "unknown" }),
      })
    ).toBeNull();
    expect(models).toHaveLength(1);
    expect(memoryRequests).toEqual([]);
  });

  test("keeps SDK validation of the repaired output", async () => {
    const repair = await prepareRepair();
    responseText = JSON.stringify({ ...repairedInput, limit: "still invalid" });
    expect(await repair(repairOptions)).toBeNull();
    expect(models[1]?.doGenerateCalls).toHaveLength(1);
    expect(memoryRequests).toEqual([]);
  });

  test("benchmarks cancelled repair calls against the unguarded baseline", async () => {
    const controller = new AbortController();
    const repair = await prepareRepair(undefined, controller.signal);
    if (!streamOptions) {
      throw new Error("Missing production stream options");
    }
    controller.abort();
    // The old nested generation did not receive the parent cancellation signal.
    await generateText({
      model: streamOptions.model,
      prompt: "Repair tool inputs.",
      output: Output.object({ schema: repairTool.inputSchema }),
    });
    const baselineCalls = models[0]?.doGenerateCalls.length;
    expect(baselineCalls).toBe(1);
    const baselineMemoryCalls = memoryRequests.splice(0).length;
    expect(await repair(repairOptions)).toBeNull();
    expect(models).toHaveLength(1);
    expect(models[0]?.doGenerateCalls).toHaveLength(baselineCalls ?? 0);
    expect(memoryRequests).toEqual([]);
    console.info("Offline cancelled-repair benchmark", {
      providerCalls: { baseline: baselineCalls, candidate: 0 },
      memoryHttpCalls: { baseline: baselineMemoryCalls, candidate: 0 },
    });
  });

  test("benchmarks pre-change repair against the production callback offline", async () => {
    const repair = await prepareRepair();
    if (!streamOptions) {
      throw new Error("Missing production stream options");
    }
    // Reproduce the pre-change memory-wrapped, doubly encoded repair request.
    const baseline = await generateText({
      model: streamOptions.model,
      providerOptions: { gateway: { tags: ["standalone-chat-tool-repair"] } },
      output: Output.object({ schema: repairTool.inputSchema }),
      prompt: [
        `The assistant called the tool "${repairOptions.toolCall.toolName}" with inputs that failed validation:`,
        JSON.stringify(brokenInput),
        "The tool expects inputs matching this JSON schema:",
        JSON.stringify(await repairOptions.inputSchema()),
        `Validation error: ${repairOptions.error.message}`,
        "Return corrected inputs that satisfy the schema.",
      ].join("\n"),
    });
    expect(baseline.output).toEqual(repairedInput);
    const baselineMemoryRequests = memoryRequests.splice(0);
    const result = await repair(repairOptions);
    expect(result?.input).toBe(JSON.stringify(baseline.output));
    expect(memoryRequests).toEqual([]);
    expect(
      baselineMemoryRequests.filter((url) => url.endsWith("/profile"))
    ).toHaveLength(1);
    expect(
      baselineMemoryRequests.filter((url) => url.endsWith("/conversations"))
    ).toHaveLength(1);
    expect(models[0]?.doGenerateCalls).toHaveLength(1);
    expect(models[1]?.doGenerateCalls).toHaveLength(1);
    const baselineBytes = Buffer.byteLength(
      JSON.stringify(models[0]?.doGenerateCalls[0]?.prompt)
    );
    const candidateBytes = Buffer.byteLength(
      JSON.stringify(models[1]?.doGenerateCalls[0]?.prompt)
    );
    expect(candidateBytes).toBeLessThan(baselineBytes);
    console.info("Offline tool-repair benchmark", {
      baselinePromptBytes: baselineBytes,
      candidatePromptBytes: candidateBytes,
      savedBytes: baselineBytes - candidateBytes,
      providerCalls: { baseline: 1, candidate: 1 },
      memoryHttpCalls: {
        baseline: baselineMemoryRequests.length,
        candidate: memoryRequests.length,
      },
    });
  });
});
