import { describe, expect, test } from "bun:test";

import type { UIMessage } from "ai";

import { buildChatMinimapTurns } from "@/utils/chat-minimap";

const text = (id: string, role: UIMessage["role"], value: string) =>
  ({ id, parts: [{ text: value, type: "text" }], role }) as UIMessage;

const getUserTitle = (message: UIMessage) =>
  message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");

describe("buildChatMinimapTurns", () => {
  test("groups assistant replies under the user message before them", () => {
    const turns = buildChatMinimapTurns(
      [
        text("u1", "user", "Write a **changelog**"),
        text("a1", "assistant", "## Changelog\n\nHere is the draft."),
        text("a2", "assistant", "Anything else?"),
        text("u2", "user", "Shorter please"),
      ],
      getUserTitle
    );

    expect(turns).toEqual([
      {
        description: "Changelog Here is the draft.",
        id: "u1",
        messageIds: ["u1", "a1", "a2"],
        title: "Write a changelog",
      },
      { id: "u2", messageIds: ["u2"], title: "Shorter please" },
    ]);
  });

  test("skips assistant messages before the first user message", () => {
    const turns = buildChatMinimapTurns(
      [text("a0", "assistant", "Hi"), text("u1", "user", "Hello")],
      getUserTitle
    );

    expect(turns.map((turn) => turn.messageIds)).toEqual([["u1"]]);
  });
});
