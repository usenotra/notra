import { expect, mock, test } from "bun:test";

import { TELEMETRY_TEST_EVENT } from "@notra/ai/constants/telemetry-test";
import type { DrainContext } from "evlog";

test("OTLP queues only a detached projection and forwards flush and live pending", async () => {
  const queued: DrainContext[] = [];
  const flush = mock(() => {
    queued.length = 0;
    return Promise.resolve();
  });
  mock.module("@notra/ai/utils/shipping-pipeline", () => ({
    createShippingPipeline: () =>
      Object.defineProperty(
        Object.assign((context: DrainContext) => queued.push(context), {
          flush,
        }),
        "pending",
        { get: () => queued.length }
      ),
  }));
  const previousEndpoint = process.env.NOTRA_OTLP_ENDPOINT;
  const previousToken = process.env.NOTRA_OTLP_TOKEN;
  try {
    process.env.NOTRA_OTLP_ENDPOINT = "https://telemetry.example.test";
    process.env.NOTRA_OTLP_TOKEN = "fixture";
    const { createOTLPPipeline } = await import("./otlp-pipeline");
    const pipeline = createOTLPPipeline();
    expect(pipeline).toBeDefined();
    const privateMarker = "private-buffer-marker".repeat(4096);
    const context: DrainContext = {
      event: {
        ...TELEMETRY_TEST_EVENT,
        requestId: "request_fixture",
        organizationId: "org_fixture",
        ai: { calls: 1, totalTokens: 2, prompt: privateMarker },
        prompt: privateMarker,
        output: privateMarker,
      },
      request: { method: "POST", path: "/private" },
      headers: { Authorization: "Bearer fixture-private-credential" },
    };
    pipeline?.(context);
    expect(pipeline?.pending).toBe(1);
    expect(queued[0]).not.toBe(context);
    expect(queued[0]).toEqual({
      event: {
        ...TELEMETRY_TEST_EVENT,
        requestId: "request_fixture",
        organizationId: "org_fixture",
        ai: { calls: 1, totalTokens: 2 },
      },
    });
    expect(queued[0]?.event).not.toBe(context.event);
    expect(queued[0]?.event.ai).not.toBe(context.event.ai);
    context.event.organizationId = "org_changed";
    (context.event.ai as Record<string, unknown>).calls = 99;
    expect(queued[0]?.event.organizationId).toBe("org_fixture");
    expect(queued[0]?.event.ai).toEqual({ calls: 1, totalTokens: 2 });
    expect(context.event.prompt).toBe(privateMarker);
    await pipeline?.flush();
    expect(flush).toHaveBeenCalledTimes(1);
    expect(pipeline?.pending).toBe(0);
  } finally {
    mock.restore();
    if (previousEndpoint === undefined) {
      delete process.env.NOTRA_OTLP_ENDPOINT;
    } else {
      process.env.NOTRA_OTLP_ENDPOINT = previousEndpoint;
    }
    if (previousToken === undefined) {
      delete process.env.NOTRA_OTLP_TOKEN;
    } else {
      process.env.NOTRA_OTLP_TOKEN = previousToken;
    }
  }
});
