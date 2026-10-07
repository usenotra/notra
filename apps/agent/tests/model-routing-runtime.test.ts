import { expect, test } from "bun:test";
import { createHash } from "node:crypto";

import { createAssistantModel } from "../agent/lib/utils/model";
import {
  ContextContainer,
  contextStorage,
} from "../node_modules/eve/dist/src/context/container.js";

test.each([
  ["production", "org-test"],
  ["eve-dev", "org-test"],
  ["eve-dev-refresh", "org-test"],
  ["eve-dev", "org-other"],
  ["eve-dev", undefined],
] as const)(
  "real Eve routing preserves %s transport and per-turn evaluation caching",
  async (mode, organizationId) => {
    const names = [
      "EVE_DEV",
      "EVE_DEV_CONTROL_URL",
      "EVE_DEV_WORKFLOW_TRANSPORT_SECRET",
      "AI_GATEWAY_API_KEY",
      "VERCEL_OIDC_TOKEN",
      "VERCEL",
      "NOTRA_JEV_CLASSIFIERS",
    ];
    const previous = Object.fromEntries(
      names.map((name) => [name, process.env[name]])
    );
    const originalFetch = globalThis.fetch;
    const abortController = new AbortController();
    let brokerCalls = 0;
    let evaluationCalls = 0;
    const local = mode !== "production";
    const refresh = mode === "eve-dev-refresh";
    for (const name of names) {
      delete process.env[name];
    }
    process.env.NOTRA_JEV_CLASSIFIERS = "true";
    if (local) {
      process.env.EVE_DEV = "1";
      process.env.EVE_DEV_CONTROL_URL = "http://localhost:59999";
      process.env.EVE_DEV_WORKFLOW_TRANSPORT_SECRET = "mock-broker-secret";
      process.env.AI_GATEWAY_API_KEY = "ignored-mock-environment-key";
    } else {
      process.env.AI_GATEWAY_API_KEY = "mock-production-key";
    }
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.startsWith("http://localhost:59999/")) {
        brokerCalls += 1;
        if (refresh && brokerCalls === 2) {
          expect(
            new Headers(init?.headers).get("x-eve-model-rejected-token-sha256")
          ).toBe(createHash("sha256").update("mock-local-key").digest("hex"));
        }
        return Response.json({
          kind: refresh ? "oauth" : "api-key",
          token:
            refresh && brokerCalls > 1
              ? "mock-refreshed-key"
              : "mock-local-key",
          teamId: "mock-team",
        });
      }
      if (!url.endsWith("/evaluation-model")) {
        throw new Error("Unexpected network boundary in mocked test");
      }
      evaluationCalls += 1;
      const headers = new Headers(init?.headers);
      const body = JSON.parse(String(init?.body));
      const initialToken = local ? "mock-local-key" : "mock-production-key";
      const expectedToken =
        refresh && evaluationCalls > 1 ? "mock-refreshed-key" : initialToken;
      expect(headers.get("authorization")).toBe(`Bearer ${expectedToken}`);
      if (local) {
        expect(headers.get("x-vercel-ai-gateway-team")).toBe("mock-team");
      }
      expect(body.providerOptions.gateway).toMatchObject({
        tags: ["evaluation-agent-model"],
        zeroDataRetention: true,
        disallowPromptTraining: true,
      });
      expect(body.providerOptions.gateway.user).toBe(organizationId);
      expect(Object.hasOwn(body.providerOptions.gateway, "user")).toBe(
        Boolean(organizationId)
      );
      if (refresh && evaluationCalls === 1) {
        return Response.json({ error: "mock expired token" }, { status: 401 });
      }
      return Response.json({
        answers: {
          route: { type: "choice", choice: "anthropic/claude-sonnet-5.5" },
        },
        warnings: [],
      });
    };
    try {
      await contextStorage.run(new ContextContainer(), async () => {
        const resolve = createAssistantModel().events["step.started"];
        const ctx = {
          abortSignal: abortController.signal,
          session: {
            id: "test-session",
            auth: {
              current: { attributes: organizationId ? { organizationId } : {} },
              initiator: null,
            },
          },
          messages: [{ role: "user", content: "A mocked question" }],
        };
        const selected = await Reflect.apply(resolve, undefined, [
          { data: { turnId: "first" } },
          ctx,
        ]);
        expect(selected.model.modelId).toBe("anthropic/claude-sonnet-5.5");
        expect(selected.modelOptions.providerOptions.gateway.user).toBe(
          organizationId
        );
        await Reflect.apply(resolve, undefined, [
          { data: { turnId: "first" } },
          ctx,
        ]);
        expect(evaluationCalls).toBe(refresh ? 2 : 1);
        await Reflect.apply(resolve, undefined, [
          { data: { turnId: "next" } },
          ctx,
        ]);
        expect(evaluationCalls).toBe(refresh ? 3 : 2);
        const expectedCalls = refresh ? 3 : 2;
        expect(brokerCalls).toBe(local ? expectedCalls : 0);
      });
    } finally {
      abortController.abort();
      globalThis.fetch = originalFetch;
      for (const name of names) {
        if (previous[name] === undefined) {
          delete process.env[name];
        } else {
          process.env[name] = previous[name];
        }
      }
    }
  }
);
