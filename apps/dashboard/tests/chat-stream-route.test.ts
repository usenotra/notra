import { beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { NextRequest } from "next/server";

if (process.env.NOTRA_CHAT_ROUTE_TEST !== "1") {
  test("chat SSE lifecycle", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_CHAT_ROUTE_TEST: "1" },
      }
    );
    expect(result.status, result.stderr.toString()).toBe(0);
  });
} else {
  let onData: (event: { id: string; data: unknown }) => void = () => undefined;
  const unsubscribe = mock(() => undefined);
  const history = mock(
    async () => [] as { id: string; event: string; data: unknown }[]
  );
  const subscribe = mock(async (input: { onData: typeof onData }) => {
    onData = input.onData;
    return unsubscribe;
  });
  let allowed = true;
  mock.module("@/lib/auth/organization", () => ({
    withOrganizationAuth: async () =>
      allowed
        ? { success: true, context: { user: { id: "user" } } }
        : { success: false, response: new Response(null, { status: 403 }) },
  }));
  mock.module("@/utils/ratelimit", () => ({
    ratelimit: { chatStream: { limit: async () => ({ success: true }) } },
  }));
  mock.module("@notra/ai/chat/history", () => ({
    getChatSession: async () => ({}),
    getActiveChatStream: async () => "active",
    getChatStreamChannelName: () => "channel",
  }));
  const constants = await import("@notra/ai/constants/chat");
  mock.module("@notra/ai/constants/chat", () => ({
    ...constants,
    CHAT_STREAM_MAX_LIFETIME_MS: 30,
  }));
  mock.module("@notra/ai/realtime", () => ({
    realtime: { channel: () => ({ history, subscribe }) },
  }));
  const { GET } =
    await import("../src/app/api/organizations/[organizationId]/chat/[chatId]/stream/route");
  const open = (signal?: AbortSignal) =>
    GET(new Request("http://localhost/stream", { signal }) as NextRequest, {
      params: Promise.resolve({
        organizationId: "org",
        chatId: "00000000-0000-4000-8000-000000000001",
      }),
    });

  beforeEach(() => {
    allowed = true;
    unsubscribe.mockClear();
    subscribe.mockClear();
    history.mockImplementation(async () => []);
  });

  test("normal finish closes and unsubscribes", async () => {
    history.mockImplementation(async () => [
      { id: "1-0", event: "ai.chunk", data: { type: "finish" } },
    ]);
    const response = await open();
    expect(await response.text()).toContain('"type":"finish"');
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  test("terminal error batch is forwarded before closing", async () => {
    history.mockImplementation(async () => [
      {
        id: "1-0",
        event: "ai.chunk",
        data: [
          { type: "error", errorText: "failed" },
          { type: "finish", finishReason: "error" },
        ],
      },
    ]);
    const text = await (await open()).text();
    expect(text).toContain('"errorText":"failed"');
    expect(text).toContain('"finishReason":"error"');
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  test("history/live overlap is deduplicated without losing finish", async () => {
    history.mockImplementation(async () => {
      expect(subscribe).toHaveBeenCalledTimes(1);
      onData({ id: "1-0", data: { type: "start", messageId: "message" } });
      onData({ id: "2-0", data: { type: "finish" } });
      return [
        {
          id: "1-0",
          event: "ai.chunk",
          data: { type: "start", messageId: "message" },
        },
      ];
    });
    const text = await (await open()).text();
    expect(text.match(/"type":"start"/g)).toHaveLength(1);
    expect(text.match(/"type":"finish"/g)).toHaveLength(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  test("timeout closes only this connection, allowing replay on reconnect", async () => {
    expect(await (await open()).text()).toBe("");
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    history.mockImplementation(async () => [
      { id: "1-0", event: "ai.chunk", data: { type: "finish" } },
    ]);
    expect(await (await open()).text()).toContain('"type":"finish"');
  });

  test("late publication of a replayed event is not duplicated", async () => {
    history.mockImplementation(async () => [
      {
        id: "1-0",
        event: "ai.chunk",
        data: { type: "start", messageId: "message" },
      },
    ]);
    const response = await open();
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Expected SSE body");
    }
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toContain('"type":"start"');
    onData({ id: "1-0", data: { type: "start", messageId: "message" } });
    onData({ id: "2-0", data: { type: "finish" } });
    const next = await reader.read();
    expect(new TextDecoder().decode(next.value)).toContain('"type":"finish"');
    expect((await reader.read()).done).toBe(true);
    reader.releaseLock();
  });

  test("abort chunk closes the connection", async () => {
    history.mockImplementation(async () => [
      { id: "1-0", event: "ai.chunk", data: { type: "abort" } },
    ]);
    expect(await (await open()).text()).toContain('"type":"abort"');
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  test("request disconnect cleans up the subscription", async () => {
    const controller = new AbortController();
    const response = await open(controller.signal);
    await Promise.resolve();
    controller.abort();
    expect(await response.text()).toBe("");
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  test("consumer cancellation cleans up the subscription", async () => {
    const response = await open();
    await Promise.resolve();
    await response.body?.cancel();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  test("unauthorized requests never subscribe", async () => {
    allowed = false;
    expect((await open()).status).toBe(403);
    expect(subscribe).not.toHaveBeenCalled();
  });
}
