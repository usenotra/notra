import { describe, expect, test } from "bun:test";

import {
  excludeArrivedGeneratingIds,
  excludeArrivedPendingSessions,
  mergePendingChatSessions,
} from "./chat-history-groups";

function session(
  chatId: string,
  title: string,
  updatedAt = "2026-01-01T00:00:00.000Z"
) {
  return {
    chatId,
    title,
    createdAt: updatedAt,
    updatedAt,
    pinnedAt: null,
  };
}

describe("mergePendingChatSessions", () => {
  test("keeps a pending chat visible until the server list includes it", () => {
    const pending = session(
      "pending-1",
      "New chat",
      "2026-01-02T00:00:00.000Z"
    );
    const merged = mergePendingChatSessions(
      [session("existing-1", "Older chat")],
      [pending]
    );

    expect(merged.map((item) => item.chatId)).toEqual([
      "pending-1",
      "existing-1",
    ]);
  });

  test("drops the pending copy once the real session arrives", () => {
    const pending = session("chat-1", "New chat");
    const merged = mergePendingChatSessions(
      [session("chat-1", "Generated title")],
      [pending]
    );

    expect(merged).toEqual([session("chat-1", "Generated title")]);
  });
});

describe("excludeArrivedPendingSessions", () => {
  test("keeps pending rows that are not in the server list", () => {
    expect(
      excludeArrivedPendingSessions(
        [session("pending-1", "New chat")],
        [session("existing-1", "Older chat")]
      ).map((item) => item.chatId)
    ).toEqual(["pending-1"]);
  });

  test("drops pending rows after their real session arrives so delete cannot resurrect them", () => {
    expect(
      excludeArrivedPendingSessions(
        [session("chat-1", "New chat")],
        [session("chat-1", "Fallback title")]
      )
    ).toEqual([]);
  });
});

describe("excludeArrivedGeneratingIds", () => {
  test("keeps generating ids whose chat has not arrived yet", () => {
    expect(
      excludeArrivedGeneratingIds(["chat-1"], [session("chat-2", "Other")])
    ).toEqual(["chat-1"]);
  });

  test("drops generating ids once the real session arrives so a failed reconcile cannot pin the skeleton", () => {
    expect(
      excludeArrivedGeneratingIds(
        ["chat-1", "chat-2"],
        [session("chat-1", "Generated title")]
      )
    ).toEqual(["chat-2"]);
  });
});
