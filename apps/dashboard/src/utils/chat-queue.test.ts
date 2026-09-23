import { describe, expect, test } from "bun:test";

import {
  markQueuedMessageSteering,
  parseQueuedMessages,
  shouldDrainQueueAfterError,
  takeQueuedMessage,
} from "./chat-queue";

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

describe("markQueuedMessageSteering", () => {
  test("marks only the chosen chip as steering and leaves it in place", () => {
    expect(
      markQueuedMessageSteering(
        [
          { id: "a", text: "first" },
          { id: "b", text: "steer me" },
        ],
        "b"
      )
    ).toEqual([
      { id: "a", text: "first" },
      { id: "b", text: "steer me", steering: true },
    ]);
  });
});

describe("shouldDrainQueueAfterError", () => {
  test("does not drain while a steered send is in flight or still pending", () => {
    expect(
      shouldDrainQueueAfterError({
        hasPendingSteer: false,
        hasSteerInFlight: true,
        isUsageLimit: false,
      })
    ).toBe(false);
    expect(
      shouldDrainQueueAfterError({
        hasPendingSteer: true,
        hasSteerInFlight: false,
        isUsageLimit: false,
      })
    ).toBe(false);
  });

  test("drains the remaining queue after a normal send error", () => {
    expect(
      shouldDrainQueueAfterError({
        hasPendingSteer: false,
        hasSteerInFlight: false,
        isUsageLimit: false,
      })
    ).toBe(true);
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
