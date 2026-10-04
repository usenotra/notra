import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { setTimeout as sleep } from "node:timers/promises";

import type { DrainContext } from "evlog";

import { getEvlogRuntime } from "../src/utils/evlog-runtime";
import { getOperationalContext } from "../src/utils/operational-context";

const runtime = getEvlogRuntime();
const original = { ...runtime };
const aiEvents: DrainContext[] = [];
const geoEvents: DrainContext[] = [];
const aiFlush = mock(async () => {});
const geoFlush = mock(async () => {});
runtime.aiDrain = Object.assign(
  (context: DrainContext) => {
    aiEvents.push(context);
  },
  { flush: aiFlush }
);
runtime.geoDrain = Object.assign(
  (context: DrainContext) => {
    geoEvents.push(context);
  },
  { flush: geoFlush }
);

const { createError, setLogFlushScheduler, useLogger, withEvlog } =
  await import("../src/evlog");

beforeEach(() => {
  aiEvents.length = 0;
  geoEvents.length = 0;
  aiFlush.mockClear();
  geoFlush.mockClear();
  runtime.flushScheduler = undefined;
});

afterAll(() => {
  Object.assign(runtime, original);
});

describe("framework-neutral request logging", () => {
  test("isolates concurrent request and operational contexts", async () => {
    const handler = withEvlog(async (request: Request) => {
      await sleep(request.url.endsWith("slow") ? 5 : 0);
      const requestId = request.headers.get("x-request-id") ?? undefined;
      expect(useLogger().getContext().requestId).toBe(requestId);
      expect(getOperationalContext()?.requestId).toBe(requestId);
      return new Response(null, { status: 204 });
    });
    await Promise.all(
      ["slow", "fast"].map((id) =>
        handler(
          new Request(`https://example.test/${id}`, {
            headers: { "x-request-id": id },
          })
        )
      )
    );
    expect(aiEvents.map(({ event }) => event.requestId).sort()).toEqual([
      "fast",
      "slow",
    ]);
    expect(aiEvents.every(({ event }) => event.status === 204)).toBe(true);
    expect(getOperationalContext()).toBeUndefined();
    expect(() => useLogger()).toThrow();
  });

  test("waits for streamed responses before emitting and scheduling flushes", async () => {
    const tasks: (() => Promise<void>)[] = [];
    setLogFlushScheduler((task) => {
      tasks.push(task);
    });
    const handler = withEvlog(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("data: hello\n\n"));
              controller.close();
            },
          }),
          { headers: { "content-type": "text/event-stream" } }
        )
    );
    const response = await handler();
    expect(aiEvents).toHaveLength(0);
    expect(tasks).toHaveLength(0);
    expect(await response.text()).toBe("data: hello\n\n");
    await sleep(0);
    expect(aiEvents).toHaveLength(1);
    expect(tasks).toHaveLength(1);
    await tasks[0]?.();
    expect(aiFlush).toHaveBeenCalledTimes(1);
  });

  test("records errors without swallowing ordinary failures", async () => {
    const failure = new Error("failure");
    await expect(
      withEvlog(async () => {
        throw failure;
      })()
    ).rejects.toBe(failure);
    expect(aiEvents[0]?.event.status).toBe(500);
  });

  test("preserves structured HTTP error responses", async () => {
    const handler = withEvlog(async (_request: Request): Promise<Response> => {
      throw createError({ message: "Invalid request", status: 400 });
    });
    const response = await handler(new Request("https://example.test/invalid"));
    expect(response.status).toBe(400);
    expect(aiEvents[0]?.event.status).toBe(400);
  });
});
