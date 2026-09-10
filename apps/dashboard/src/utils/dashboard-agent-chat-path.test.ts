import { expect, test } from "bun:test";

import { dashboardAgentOpenChatPath } from "./dashboard-agent-chat-path";

test("opens an existing agent conversation on the studio chat page", () => {
  expect(
    dashboardAgentOpenChatPath("acme", {
      chatId: "11111111-1111-4111-8111-111111111111",
      hasConversation: true,
    })
  ).toBe("/acme/chat/11111111-1111-4111-8111-111111111111");
});

test("opens a new studio chat when the agent panel has no conversation yet", () => {
  expect(
    dashboardAgentOpenChatPath("acme", {
      chatId: "11111111-1111-4111-8111-111111111111",
      hasConversation: false,
    })
  ).toBe("/acme/chat");
});
