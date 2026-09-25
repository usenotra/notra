import { beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { UIMessageChunk } from "ai";

if (process.env.NOTRA_CHAT_STEP_TEST !== "1") {
  test("chat workflow terminal publication", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_CHAT_STEP_TEST: "1" },
      }
    );
    expect(result.status, result.stderr.toString()).toBe(0);
  });
} else {
  const emitted: UIMessageChunk[] = [];
  const order: string[] = [];
  let mode = "failed";
  const stopPolling = mock(() => undefined);
  const save = mock(async (..._args: unknown[]) => true);
  const clear = mock(async () => {
    order.push("clear");
  });
  mock.module("@notra/ai/billing/autumn", () => ({
    autumn: null,
    allowUnmeteredAiInDevelopment: true,
  }));
  mock.module("@notra/ai/billing/chat-billing", () => ({
    checkChatBilling: async () => ({ allowed: true }),
  }));
  mock.module("@notra/ai/chat/history", () => ({
    loadChatHistory: async () => [
      { id: "user", role: "user", parts: [{ type: "text", text: "hello" }] },
    ],
    getChatProjectId: async () => undefined,
    getChatStreamChannelName: () => "channel",
    replaceChatHistory: save,
    clearActiveChatStream: clear,
    clearChatAbortFlag: async () => undefined,
    claimChatWorkflowRequest: async () => true,
  }));
  mock.module("@notra/ai/chat/abort-polling", () => ({
    startChatAbortPolling: ({ onAbort }: { onAbort: () => void }) => {
      if (mode === "user-abort") {
        setTimeout(onAbort, 10);
      }
      return stopPolling;
    },
  }));
  mock.module("@notra/ai/integrations/github", () => ({
    getGitHubIntegrationById: mock(),
    getGitHubIntegrationsByOrganization: mock(),
    getGitHubToolRepositoryContextByIntegrationId: mock(),
  }));
  mock.module("@notra/ai/integrations/linear", () => ({
    getLinearIntegrationById: mock(),
    getLinearIntegrationsByOrganization: mock(),
    getLinearToolContextByIntegrationId: mock(),
  }));
  mock.module("@notra/ai/realtime", () => ({
    realtime: {
      channel: () => ({
        emit: async (_: string, data: UIMessageChunk | UIMessageChunk[]) => {
          emitted.push(...(Array.isArray(data) ? data : [data]));
          order.push("emit");
        },
      }),
    },
  }));
  mock.module("@notra/posthog/server", () => ({
    flushPostHogServer: async () => undefined,
  }));
  mock.module("@/lib/analytics/posthog-server", () => ({
    trackServerEventAndFlush: async () => undefined,
  }));
  mock.module("@/lib/workflows/step-errors", () => ({
    reportStepError: async () => undefined,
  }));
  mock.module("@/lib/tcc", () => ({
    buildStandaloneChatTelemetryMetadata: () => ({}),
  }));
  mock.module("@notra/ai/utils/chat", () => ({
    buildChatFinishMetadata: () => ({}),
  }));
  mock.module("@notra/ai/orchestration/orchestrate-standalone", () => ({
    orchestrateStandaloneChat: async ({
      abortSignal,
    }: {
      abortSignal: AbortSignal;
    }) => ({
      routingDecision: { model: "fixture" },
      stream: {
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "start" });
            controller.enqueue({ type: "text-start", id: "text" });
            controller.enqueue({
              type: "text-delta",
              id: "text",
              text: "partial",
            });
            controller.enqueue({ type: "text-end", id: "text" });
            if (mode === "user-abort") {
              abortSignal.addEventListener(
                "abort",
                () => {
                  controller.enqueue({ type: "abort" });
                  controller.close();
                },
                { once: true }
              );
              return;
            }
            if (mode === "failed") {
              controller.enqueue({
                type: "error",
                error: new Error("model failed"),
              });
            } else if (mode === "aborted") {
              controller.enqueue({ type: "abort" });
            } else {
              if (mode === "tool") {
                controller.enqueue({
                  type: "tool-call",
                  toolCallId: "call",
                  toolName: "lookup",
                  input: {},
                });
                controller.enqueue({
                  type: "tool-error",
                  toolCallId: "call",
                  toolName: "lookup",
                  input: {},
                  error: new Error("recoverable tool error"),
                });
              }
              controller.enqueue({
                type: "finish",
                finishReason: "stop",
                totalUsage: {},
              });
            }
            controller.close();
          },
        }),
      },
    }),
  }));
  const { streamChatResponseStep } =
    await import("../src/workflows/steps/chat-steps");
  const run = () =>
    streamChatResponseStep({
      organizationId: "org",
      chatId: "chat",
      streamId: "stream",
      requestId: "request",
      userId: "user",
      context: [],
    } as never);

  beforeEach(() => {
    emitted.length = 0;
    order.length = 0;
    clear.mockClear();
    save.mockClear();
    stopPolling.mockClear();
  });

  test("fatal model error publishes finish and preserves partial history before clearing active", async () => {
    mode = "failed";
    expect(await run()).toEqual({ status: "failed" });
    expect(emitted.at(-1)).toEqual({ type: "finish", finishReason: "error" });
    expect(emitted.some((chunk) => chunk.type === "error")).toBe(true);
    expect(save.mock.calls[0]?.[2]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "assistant",
          parts: expect.arrayContaining([
            expect.objectContaining({ type: "text", text: "partial" }),
          ]),
        }),
      ])
    );
    expect(order.at(-1)).toBe("clear");
    expect(clear).toHaveBeenCalledTimes(1);
    expect(stopPolling).toHaveBeenCalledTimes(1);
  });

  test("normal finish is not duplicated", async () => {
    mode = "completed";
    expect(await run()).toEqual({ status: "completed" });
    expect(emitted.filter((chunk) => chunk.type === "finish")).toHaveLength(1);
    expect(clear).toHaveBeenCalledTimes(1);
  });

  test("tool errors are recoverable and do not fail generation", async () => {
    mode = "tool";
    expect(await run()).toEqual({ status: "completed" });
    expect(emitted.some((chunk) => chunk.type === "tool-output-error")).toBe(
      true
    );
    expect(emitted.filter((chunk) => chunk.type === "finish")).toHaveLength(1);
  });

  test("model abort preserves partial history and clears active", async () => {
    mode = "aborted";
    expect(await run()).toEqual({ status: "aborted" });
    expect(emitted.some((chunk) => chunk.type === "abort")).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(stopPolling).toHaveBeenCalledTimes(1);
  });

  test("user stop cancels the reader, saves partial history and publishes a terminal result", async () => {
    mode = "user-abort";
    expect(await run()).toEqual({ status: "aborted" });
    expect(emitted.at(-1)).toEqual({ type: "finish", finishReason: "stop" });
    expect(save).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(stopPolling).toHaveBeenCalledTimes(1);
  });
}
