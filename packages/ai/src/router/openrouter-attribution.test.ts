import { expect, test } from "bun:test";

import { createOpenRouterAdapter } from "./adapters/openrouter";
import { callOptions } from "./test-helpers";

test.each([undefined, "explicit-user"])(
  "OpenRouter receives organization attribution without replacing %s",
  async (user) => {
    const adapter = createOpenRouterAdapter({
      apiKey: "mock-key",
      fetch: async (_url, init) => {
        const body = JSON.parse(String(init?.body));
        expect(body.user).toBe(user ?? "org-test");
        expect(body.provider).toEqual({ zdr: true, data_collection: "deny" });
        return Response.json({
          id: "response-test",
          created: 0,
          model: "openai/gpt-6-sol",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "OK" },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        });
      },
    });
    await adapter.createModel("openai/gpt-6-sol").doGenerate({
      ...callOptions(),
      providerOptions: adapter.buildProviderOptions({
        organizationId: "org-test",
        providerOptions: user ? { openrouter: { user } } : {},
        router: {},
        allowNonZdr: false,
      }),
    });
  }
);

test("OpenRouter leaves organization-free calls unattributed", () => {
  const adapter = createOpenRouterAdapter({ apiKey: "mock-key" });
  expect(
    adapter.buildProviderOptions({
      providerOptions: {},
      router: {},
      allowNonZdr: false,
    }).openrouter?.user
  ).toBeUndefined();
});
