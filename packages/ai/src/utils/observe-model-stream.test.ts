import { spyOn } from "bun:test";
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

import type { LanguageModelV3StreamPart } from "@ai-sdk/provider";
import { createCaptureLogger } from "@notra/ai/router/test-helpers";

import { createModelCallTelemetry } from "./model-call-telemetry";
import { observeModelStream } from "./observe-model-stream";

describe("stream terminal telemetry", () => {
  let now: number;
  let clock: ReturnType<typeof spyOn>;
  let logger: ReturnType<typeof createCaptureLogger>;
  let abortController: AbortController;
  let source: ReadableStreamDefaultController<LanguageModelV3StreamPart>;
  let reader: ReadableStreamDefaultReader<LanguageModelV3StreamPart>;
  let cancelledWith: unknown;
  let onPull: (() => void) | undefined;
  let finish: LanguageModelV3StreamPart;

  beforeEach(() => {
    now = 0;
    clock = spyOn(performance, "now").mockImplementation(() => now);
    logger = createCaptureLogger();
    abortController = new AbortController();
    cancelledWith = undefined;
    onPull = undefined;
    const telemetry = createModelCallTelemetry({
      logger,
      request: { modelId: "test-model", organizationId: "org-test" },
      operation: "stream",
      signal: abortController.signal,
    });
    const stream = new ReadableStream<LanguageModelV3StreamPart>(
      {
        start(controller) {
          source = controller;
        },
        pull() {
          onPull?.();
        },
        cancel(reason) {
          cancelledWith = reason;
        },
      },
      { highWaterMark: 0 }
    );
    reader = observeModelStream(stream, telemetry).getReader();
    finish = {
      type: "finish",
      finishReason: { unified: "stop", raw: "stop" },
      usage: {
        inputTokens: { total: 11, noCache: 8, cacheRead: 3, cacheWrite: 0 },
        outputTokens: { total: 7, text: 5, reasoning: 2 },
      },
    };
  });

  afterEach(() => {
    clock.mockRestore();
  });

  test("finish records usage and first-content timing once, even after a later abort", async () => {
    source.enqueue({ type: "response-metadata", id: "response-test" });
    await reader.read();
    now = 10;
    source.enqueue({ type: "text-delta", id: "text", delta: "" });
    await reader.read();
    now = 20;
    source.enqueue({
      type: "reasoning-delta",
      id: "reasoning",
      delta: "first",
    });
    await reader.read();
    now = 40;
    source.enqueue({ type: "text-delta", id: "text", delta: "second" });
    await reader.read();
    assert.equal(logger.entries.length, 1);
    now = 60;
    source.enqueue(finish);
    assert.equal((await reader.read()).value, finish);
    now = 80;
    source.close();
    assert.equal((await reader.read()).done, true);
    abortController.abort();
    await reader.cancel();

    assert.deepEqual(
      logger.entries.map((entry) => entry.event),
      ["ai.call.started", "ai.call.completed"]
    );
    const [start, terminal] = logger.entries;
    assert.equal(terminal?.level, "info");
    assert.ok(typeof start?.fields?.callId === "string");
    assert.equal(terminal?.fields?.callId, start.fields.callId);
    assert.equal(terminal?.fields?.organizationId, "org-test");
    assert.equal(terminal?.fields?.durationMs, 60);
    assert.deepEqual(terminal?.fields?.ai, {
      model: "test-model",
      msToFinish: 60,
      msToFirstChunk: 20,
      inputTokens: 11,
      outputTokens: 7,
      totalTokens: 18,
      cacheReadTokens: 3,
      reasoningTokens: 2,
      finishReason: "stop",
      responseId: "response-test",
    });
  });

  test("an error chunk stays failed when a finish chunk arrives later", async () => {
    const error = new Error("provider failed");
    now = 40;
    source.enqueue({ type: "error", error });
    assert.deepEqual((await reader.read()).value, { type: "error", error });
    now = 60;
    source.enqueue(finish);
    assert.equal((await reader.read()).value, finish);
    source.close();
    await reader.read();

    assert.deepEqual(
      logger.entries.map((entry) => entry.event),
      ["ai.call.started", "ai.call.failed"]
    );
    const terminal = logger.entries[1];
    assert.equal(terminal?.level, "error");
    assert.equal(terminal?.fields?.error, error.message);
    assert.equal(terminal?.fields?.durationMs, 40);
    assert.deepEqual(terminal?.fields?.ai, {
      model: "test-model",
      msToFinish: 40,
      msToFirstChunk: undefined,
    });
  });

  test("a transport error is rethrown and records one failure", async () => {
    const error = new Error("connection lost");
    now = 30;
    source.error(error);
    await assert.rejects(reader.read(), (caught) => caught === error);
    now = 50;
    abortController.abort();

    assert.deepEqual(
      logger.entries.map((entry) => entry.event),
      ["ai.call.started", "ai.call.failed"]
    );
    const terminal = logger.entries[1];
    assert.equal(terminal?.level, "error");
    assert.equal(terminal?.fields?.error, error.message);
    assert.equal(terminal?.fields?.durationMs, 30);
    assert.deepEqual(terminal?.fields?.ai, {
      model: "test-model",
      msToFinish: 30,
      msToFirstChunk: undefined,
    });
  });

  test("finishless EOF records incomplete without inventing usage or first-content timing", async () => {
    now = 10;
    source.close();
    assert.equal((await reader.read()).done, true);
    now = 20;
    abortController.abort();

    assert.deepEqual(
      logger.entries.map((entry) => entry.event),
      ["ai.call.started", "ai.call.incomplete"]
    );
    const terminal = logger.entries[1];
    assert.equal(terminal?.level, "warn");
    assert.equal(
      terminal?.fields?.error,
      "Stream closed without a finish event"
    );
    assert.equal(terminal?.fields?.durationMs, 10);
    assert.deepEqual(terminal?.fields?.ai, {
      model: "test-model",
      msToFinish: 10,
      msToFirstChunk: undefined,
    });
  });

  test("cancelling an outstanding read reaches the upstream and records one abort", async () => {
    now = 20;
    source.enqueue({ type: "text-delta", id: "text", delta: "first" });
    await reader.read();
    const upstreamRead = new Promise<void>((resolve) => {
      onPull = resolve;
    });
    const pending = reader.read();
    await upstreamRead;
    now = 60;
    const reason = new Error("consumer stopped");
    await reader.cancel(reason);
    assert.equal((await pending).done, true);
    assert.equal(cancelledWith, reason);
    now = 80;
    abortController.abort();

    assert.deepEqual(
      logger.entries.map((entry) => entry.event),
      ["ai.call.started", "ai.call.aborted"]
    );
    const terminal = logger.entries[1];
    assert.equal(terminal?.level, "warn");
    assert.equal(terminal?.fields?.error, undefined);
    assert.equal(terminal?.fields?.durationMs, 60);
    assert.deepEqual(terminal?.fields?.ai, {
      model: "test-model",
      msToFinish: 60,
      msToFirstChunk: 20,
    });
  });

  test("an abort signal records an unconsumed stream once despite subsequent cancellation", async () => {
    now = 25;
    abortController.abort();
    now = 50;
    const reason = new Error("cleanup");
    await reader.cancel(reason);
    assert.equal(cancelledWith, reason);

    assert.deepEqual(
      logger.entries.map((entry) => entry.event),
      ["ai.call.started", "ai.call.aborted"]
    );
    const terminal = logger.entries[1];
    assert.equal(terminal?.level, "warn");
    assert.equal(terminal?.fields?.error, undefined);
    assert.equal(terminal?.fields?.durationMs, 25);
    assert.deepEqual(terminal?.fields?.ai, {
      model: "test-model",
      msToFinish: 25,
      msToFirstChunk: undefined,
    });
  });
});
