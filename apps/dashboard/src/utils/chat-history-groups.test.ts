import { describe, expect, test } from "bun:test";

import { mergePendingChatSessions } from "./chat-history-groups";

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

    expect(merged.sessions.map((item) => item.chatId)).toEqual([
      "pending-1",
      "existing-1",
    ]);
    expect([...merged.generatingTitleChatIds]).toEqual(["pending-1"]);
  });

  test("drops the pending copy once the real session arrives", () => {
    const pending = session("chat-1", "New chat");
    const merged = mergePendingChatSessions(
      [session("chat-1", "Generated title")],
      [pending]
    );

    expect(merged.sessions).toEqual([session("chat-1", "Generated title")]);
    expect(merged.generatingTitleChatIds.size).toBe(0);
  });
});
