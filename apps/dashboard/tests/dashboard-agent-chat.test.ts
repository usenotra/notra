import { beforeEach, expect, mock, test } from "bun:test";

import type { UIMessage } from "ai";
import type { NextRequest } from "next/server";

import type { AgentChatStreamOptions } from "./types/dashboard-agent";

let history: UIMessage[] = [];
let owner: string | null = null;
let source = "agent";
let failGeneration = false;
let finish: (messages: UIMessage[]) => Promise<void>;
const user = (id: string): UIMessage => ({
  id,
  role: "user",
  parts: [{ type: "text", text: id }],
});
mock.module("@notra/ai/chat/history", () => ({
  clearActiveChatStream: async (_org: string, _chat: string, id: string) => {
    if (owner === id) {
      owner = null;
    }
    return true;
  },
  setActiveChatStream: async (_org: string, _chat: string, id: string) => {
    if (owner) {
      return false;
    }
    owner = id;
    return true;
  },
  getChatSession: async () => ({ externalChannelId: { source } }),
  listChatSessions: async () => [],
  loadChatHistory: async () => [...history],
  replaceChatHistory: async (
    _org: string,
    _chat: string,
    messages: UIMessage[],
    _channel: unknown,
    expected: string | null
  ) => {
    if ((history.at(-1)?.id ?? null) !== expected) {
      return false;
    }
    history = [...messages];
    return true;
  },
}));
mock.module("@notra/ai/billing/autumn", () => ({
  allowUnmeteredAiInDevelopment: true,
  autumn: null,
}));
mock.module("@notra/ai/billing/chat-billing", () => ({
  checkChatBilling: async () => ({ allowed: true }),
}));
mock.module("@notra/ai/billing/ai-credit-cost", () => ({
  calculateAiCreditCostCents: () => ({ costCents: 0 }),
}));
mock.module("@notra/ai/evlog", () => ({
  log: { info: mock(), warn: mock(), error: mock() },
  useLogger: () => ({ set: () => {} }),
  withEvlog: (handler: unknown) => handler,
}));
mock.module("@notra/ai/integrations/github", () => ({
  getGitHubToolRepositoryContextByIntegrationId: mock(),
}));
mock.module("@notra/ai/integrations/granola", () => ({
  getGranolaToolContextByIntegrationId: mock(),
}));
mock.module("@notra/ai/integrations/linear", () => ({
  getLinearToolContextByIntegrationId: mock(),
}));
mock.module("@notra/ai/orchestration/orchestrate-standalone", () => ({
  orchestrateStandaloneChat: async () => {
    if (failGeneration) {
      throw new Error("Generation failed");
    }
    return {
      stream: {
        toUIMessageStreamResponse: (options: AgentChatStreamOptions) => {
          finish = (messages) => options.onFinish({ messages });
          return new Response("stream");
        },
      },
    };
  },
}));
mock.module("@/lib/auth/organization", () => ({
  withOrganizationAuth: async () => ({
    success: true,
    context: { user: { id: "member" } },
  }),
}));
mock.module("@/lib/analytics/posthog-server", () => ({
  trackServerEvent: mock(),
}));
mock.module("@/utils/chat-ratelimit", () => ({
  enforceChatGenerationRatelimit: async () => null,
}));
const { POST } =
  await import("../src/app/api/organizations/[organizationId]/dashboard-agent/chat/route");
function submit(messages: UIMessage[]) {
  return POST(
    new Request("http://localhost/api/organizations/org/dashboard-agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: "11111111-1111-4111-8111-111111111111",
        messages,
      }),
    }) as NextRequest,
    { params: Promise.resolve({ organizationId: "org" }) }
  );
}
beforeEach(() => {
  history = [];
  owner = null;
  source = "agent";
  failGeneration = false;
});
test("concurrent members cannot overwrite an active generation", async () => {
  const responses = await Promise.all([
    submit([user("a")]),
    submit([user("b")]),
  ]);
  expect(responses.map((response) => response.status).sort()).toEqual([
    200, 409,
  ]);
  expect(history).toHaveLength(1);
  expect(owner).not.toBeNull();
  await finish([...history, { ...user("reply"), role: "assistant" }]);
  expect(history).toHaveLength(2);
  expect(owner).toBeNull();
});
test("stale clients preserve stored messages", async () => {
  history = [user("other-member"), { ...user("reply"), role: "assistant" }];
  expect((await submit([user("new-message")])).status).toBe(200);
  expect(history.map((message) => message.id)).toEqual([
    "other-member",
    "reply",
    "new-message",
  ]);
});
test("stale completions cannot overwrite newer history", async () => {
  await submit([user("a")]);
  const response = [
    ...history,
    { ...user("reply"), role: "assistant" as const },
  ];
  history.push(user("newer"));
  await finish(response);
  expect(history.at(-1)?.id).toBe("newer");
  expect(owner).toBeNull();
});
test("duplicate submissions release the lock", async () => {
  history = [user("a")];
  expect((await submit([user("a")])).status).toBe(409);
  expect(history).toHaveLength(1);
  expect(owner).toBeNull();
});
test("standalone sessions are rejected by the agent route", async () => {
  source = "dashboard";
  expect((await submit([user("a")])).status).toBe(404);
  expect(history).toHaveLength(0);
  expect(owner).toBeNull();
});
test("generation failures release the lock", async () => {
  failGeneration = true;
  expect((await submit([user("a")])).status).toBe(500);
  expect(owner).toBeNull();
});
