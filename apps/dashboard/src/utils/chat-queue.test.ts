import { describe, expect, test } from "bun:test";

import { Chat } from "@ai-sdk/react";
import type { UIMessageChunk } from "ai";

import type { QueuedMessage } from "@/components/chat/chat-queue";

import {
  markQueuedMessageSteering,
  parseQueuedMessages,
  shouldDrainQueueAfterFinish,
  takeQueuedMessage,
} from "./chat-queue";

describe("chat queue", () => {
  test("only successful or explicitly steered completions can advance the queue", () => {
    expect(
      shouldDrainQueueAfterFinish({
        isError: false,
        isDisconnect: false,
        wasStoppedByUser: false,
      })
    ).toBe(true);

    for (const flags of [
      {
        isAbort: true,
        isError: false,
        isDisconnect: false,
        wasStoppedByUser: false,
      },
      { isError: true, isDisconnect: false, wasStoppedByUser: false },
      { isError: false, isDisconnect: true, wasStoppedByUser: false },
      { isError: false, isDisconnect: false, wasStoppedByUser: true },
    ]) {
      expect(shouldDrainQueueAfterFinish(flags)).toBe(false);
    }
    expect(
      shouldDrainQueueAfterFinish({
        isAbort: true,
        isError: false,
        isDisconnect: false,
        wasInterruptedForQueue: true,
        wasStoppedByUser: false,
      })
    ).toBe(true);
  });

  test("an SDK HTTP error also calls onFinish without consuming the next message", async () => {
    const queued = ["next", "last"];
    const events: string[] = [];
    const chat = new Chat({
      transport: {
        sendMessages: () => Promise.reject(new Error("USAGE_LIMIT_REACHED")),
        reconnectToStream: () => Promise.resolve(null),
      },
      onError: () => events.push("error"),
      onFinish: ({ isError, isDisconnect }) => {
        events.push("finish");
        if (
          shouldDrainQueueAfterFinish({
            isError,
            isDisconnect,
            wasStoppedByUser: false,
          })
        ) {
          queued.shift();
        }
      },
    });

    await chat.sendMessage({ text: "first" });

    expect(events).toEqual(["error", "finish"]);
    expect(chat.status).toBe("error");
    expect(queued).toEqual(["next", "last"]);
  });

  test("a successful SDK completion permits the next queued message", async () => {
    const queued = ["next", "last"];
    const chat = new Chat({
      transport: {
        sendMessages: () =>
          Promise.resolve(
            new ReadableStream<UIMessageChunk>({
              start(controller) {
                controller.enqueue({ type: "start", messageId: "reply" });
                controller.enqueue({ type: "finish", finishReason: "stop" });
                controller.close();
              },
            })
          ),
        reconnectToStream: () => Promise.resolve(null),
      },
      onFinish: ({ isError, isDisconnect }) => {
        if (
          shouldDrainQueueAfterFinish({
            isError,
            isDisconnect,
            wasStoppedByUser: false,
          })
        ) {
          queued.shift();
        }
      },
    });

    await chat.sendMessage({ text: "first" });

    expect(chat.status).toBe("ready");
    expect(queued).toEqual(["last"]);
  });

  test("aborting an SDK request keeps the queue paused", async () => {
    const queued = ["next", "last"];
    let notifyStarted = () => {};
    const started = new Promise<void>((resolve) => {
      notifyStarted = resolve;
    });
    const chat = new Chat({
      transport: {
        sendMessages: ({ abortSignal }) => {
          notifyStarted();
          return new Promise<ReadableStream<UIMessageChunk>>((_, reject) => {
            abortSignal?.addEventListener("abort", () => {
              reject(new DOMException("Request aborted", "AbortError"));
            });
          });
        },
        reconnectToStream: () => Promise.resolve(null),
      },
      onFinish: ({ isAbort, isError, isDisconnect }) => {
        if (
          shouldDrainQueueAfterFinish({
            isAbort,
            isError,
            isDisconnect,
            wasStoppedByUser: false,
          })
        ) {
          queued.shift();
        }
      },
    });

    const request = chat.sendMessage({ text: "first" });
    await started;
    await chat.stop();
    await request;

    expect(chat.status).toBe("ready");
    expect(queued).toEqual(["next", "last"]);
  });

  test("steering takes exactly one message and preserves the remaining order", () => {
    const queue: QueuedMessage[] = [
      { id: "a", text: "first" },
      { id: "b", text: "second" },
      { id: "c", text: "third" },
    ];
    const marked = markQueuedMessageSteering(queue, "c");

    expect(marked[2]?.steering).toBe(true);
    expect(takeQueuedMessage(marked, "c")).toEqual({
      message: { id: "c", text: "third", steering: true },
      remaining: queue.slice(0, 2),
    });
    expect(takeQueuedMessage(queue, "missing")).toBeNull();
    expect(queue[2]).toEqual({ id: "c", text: "third" });
  });

  test("reload restores messages without a stale steering lock", () => {
    expect(
      parseQueuedMessages([
        { id: "a", text: "first", authorUserId: "user", steering: true },
        { id: "b", text: "second" },
        null,
        { id: 1, text: "invalid" },
      ])
    ).toEqual([
      { id: "a", text: "first", authorUserId: "user" },
      { id: "b", text: "second" },
    ]);
    expect(parseQueuedMessages(null)).toEqual([]);
  });
});
