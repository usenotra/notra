import { describe, expect, test } from "bun:test";

import { parseQueuedMessages, takeQueuedMessage } from "./chat-queue";

describe("takeQueuedMessage", () => {
  test("pulls a queued message without changing the rest of the order", () => {
    const taken = takeQueuedMessage(
      [
        { id: "a", text: "first" },
        { id: "b", text: "steer me" },
        { id: "c", text: "third" },
      ],
      "b"
    );

    expect(taken).toEqual({
      message: { id: "b", text: "steer me" },
      remaining: [
        { id: "a", text: "first" },
        { id: "c", text: "third" },
      ],
    });
  });

  test("returns null when the message is not queued", () => {
    expect(takeQueuedMessage([{ id: "a", text: "first" }], "missing")).toBe(
      null
    );
  });
});

describe("parseQueuedMessages", () => {
  test("keeps only queued items with an id and text", () => {
    expect(
      parseQueuedMessages([
        { id: "a", text: "keep", authorUserId: "user-1" },
        { id: "b" },
        { text: "no-id" },
      ])
    ).toEqual([{ id: "a", text: "keep", authorUserId: "user-1" }]);
  });
});
