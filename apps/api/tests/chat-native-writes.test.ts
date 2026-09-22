import { afterAll, expect, mock, test } from "bun:test";

import { simulateReadableStream, type UIMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";

import type { AuthData } from "../src/types/auth";

const originals = {
  "@notra/ai/model": { ...(await import("@notra/ai/model")) },
  "@notra/ai/skills/functions/service": {
    ...(await import("@notra/ai/skills/functions/service")),
  },
  "@notra/ai/integrations/mcp-tool-index": {
    ...(await import("@notra/ai/integrations/mcp-tool-index")),
  },
  "@notra/ai/utils/chat-workspace": {
    ...(await import("@notra/ai/utils/chat-workspace")),
  },
  "@notra/ai/chat/abort-polling": {
    ...(await import("@notra/ai/chat/abort-polling")),
  },
  "@notra/ai/chat/history": { ...(await import("@notra/ai/chat/history")) },
  "@notra/ai/billing/autumn": { ...(await import("@notra/ai/billing/autumn")) },
};

const savedSkills: string[] = [];
let lastModel: MockLanguageModelV4;
mock.module("@notra/ai/model", () => ({
  ...originals["@notra/ai/model"],
  createModel: () => {
    let step = 0;
    lastModel = new MockLanguageModelV4({
      doStream: async (options) => {
        const canSave = options.tools?.some(
          (tool) => tool.name === "createSkill"
        );
        const callSkill = step++ === 0 && canSave;
        return {
          stream: simulateReadableStream({
            chunks: [
              { type: "stream-start", warnings: [] },
              ...(callSkill
                ? [
                    {
                      type: "tool-call" as const,
                      toolCallId: "save-skill",
                      toolName: "createSkill",
                      input: JSON.stringify({
                        name: "marketplace-review-voice",
                        description: "Reviews",
                        content: "Write clear reviews.",
                      }),
                    },
                  ]
                : []),
              {
                type: "finish",
                finishReason: {
                  unified: callSkill ? "tool-calls" : "stop",
                  raw: "stop",
                },
                usage: {
                  inputTokens: {
                    total: 1,
                    noCache: 1,
                    cacheRead: 0,
                    cacheWrite: 0,
                  },
                  outputTokens: { total: 1, text: 1, reasoning: 0 },
                },
              },
            ],
          }),
        };
      },
    });
    return lastModel;
  },
}));
mock.module("@notra/ai/skills/functions/service", () => ({
  ...originals["@notra/ai/skills/functions/service"],
  listSkillSummaries: async () => [],
  listSkillCatalog: async () => ({ skills: [], total: 0 }),
  loadSkillByName: async () => null,
  createSkill: async (
    _ctx: unknown,
    input: { name: string; description: string; content: string }
  ) => {
    savedSkills.push(input.name);
    return input;
  },
}));
mock.module("@notra/ai/integrations/mcp-tool-index", () => ({
  ...originals["@notra/ai/integrations/mcp-tool-index"],
  getEnabledMcpServerCount: async () => 0,
}));
mock.module("@notra/ai/utils/chat-workspace", () => ({
  ...originals["@notra/ai/utils/chat-workspace"],
  loadChatWorkspace: async () => null,
  sanitizeChatWorkspaceLabel: (value: string) => value,
}));
mock.module("@notra/ai/chat/abort-polling", () => ({
  ...originals["@notra/ai/chat/abort-polling"],
  startChatAbortPolling: () => () => {},
}));
mock.module("@notra/ai/chat/history", () => ({
  ...originals["@notra/ai/chat/history"],
  clearActiveChatStream: async () => {},
  clearChatAbortFlag: async () => {},
  replaceChatHistory: async () => true,
}));
mock.module("@notra/ai/billing/autumn", () => ({
  ...originals["@notra/ai/billing/autumn"],
  autumn: null,
  allowUnmeteredAiInDevelopment: false,
}));

const { createDirectStandaloneChatResponse } =
  await import("../src/lib/chat/direct-stream");
const { orchestrateStandaloneChat } =
  await import("@notra/ai/orchestration/orchestrate-standalone");
const { createCaptureLogger } = await import("@notra/ai/router/test-helpers");
const messages: UIMessage[] = [
  {
    id: "user-1",
    role: "user",
    parts: [{ type: "text", text: "Save the skill" }],
  },
];

afterAll(() => {
  for (const [name, original] of Object.entries(originals)) {
    mock.module(name, () => original);
  }
  mock.restore();
});

test.each(
  ["oauth", "key"].flatMap((kind) =>
    [
      ["chats.write"],
      ["skills.read", "posts.read"],
      ["skills.write"],
      ["posts.write"],
      ["skills.write", "posts.write"],
      ["api.write"],
      ["*"],
      [],
    ].map((scopes) => ({ kind, scopes }))
  )
)("$kind API permissions: $scopes", async ({ kind, scopes }) => {
  savedSkills.length = 0;
  const auth: AuthData =
    kind === "oauth"
      ? {
          type: "oauth",
          keyId: "key",
          userId: "user",
          identity: { externalId: "org" },
          scopes,
        }
      : { valid: true, code: "VALID", permissions: scopes };
  const response = await createDirectStandaloneChatResponse({
    organizationId: "org",
    auth,
    chatId: "chat",
    messages,
    context: [],
    validatedIntegrations: [],
    useMarkup: false,
    chargeAiCredits: false,
    requestId: "request",
    log: createCaptureLogger(),
    model: "openai/gpt-5.5",
    enableThinking: false,
    telemetryMetadata: {},
  });
  const output = await response.text();
  const all = scopes.includes("api.write") || scopes.includes("*");
  const skillsAllowed = all || scopes.includes("skills.write");
  const postsAllowed = all || scopes.includes("posts.write");
  expect(savedSkills.length).toBe(skillsAllowed ? 1 : 0);
  expect(output).not.toContain('"type":"tool-approval-request"');
  const names =
    lastModel.doStreamCalls[0]?.tools?.map((tool) => tool.name) ?? [];
  expect(names.includes("createSkill")).toBe(skillsAllowed);
  for (const name of [
    "createBlogPost",
    "createChangelog",
    "createTwitterPost",
    "createLinkedInPost",
    "createInvestorUpdate",
    "updatePost",
  ]) {
    expect(names.includes(name)).toBe(postsAllowed);
  }
});

test("interactive orchestration still pauses the real skill tool for approval", async () => {
  savedSkills.length = 0;
  const { stream } = await orchestrateStandaloneChat(
    {
      organizationId: "org",
      messages,
      requestedModel: "openai/gpt-5.5",
      enableThinking: false,
      maxSteps: 1,
    },
    { preValidatedIntegrations: [] }
  );
  const chunks = [];
  for await (const chunk of stream.stream) {
    chunks.push(chunk);
  }
  expect(savedSkills).toEqual([]);
  expect(chunks.some((chunk) => chunk.type === "tool-approval-request")).toBe(
    true
  );
});
