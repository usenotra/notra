import { expect, test } from "bun:test";

import { createEvaluationClient } from "./client";

test.each(["org-test", undefined])(
  "Jev attributes organization %s on the wire",
  async (organizationId) => {
    const client = createEvaluationClient({
      enabled: true,
      apiKey: "mock-key",
      fetch: async (_url, init) => {
        const body = JSON.parse(String(init?.body));
        expect(body.providerOptions.gateway.user).toBe(organizationId);
        expect(body.providerOptions.gateway.tags).toEqual([
          "evaluation-geo-mention",
        ]);
        expect(body.providerOptions.gateway.zeroDataRetention).toBe(true);
        expect(body.providerOptions.gateway.disallowPromptTraining).toBe(true);
        return Response.json({
          answers: { mentioned: { type: "boolean", probability: 0.9 } },
          warnings: [],
        });
      },
    });
    const result = await client.evaluate({
      organizationId,
      feature: "geo-mention",
      state: "A mock brand is mentioned.",
      questions: {
        mentioned: {
          type: "boolean",
          instructions: "Does the answer mention the brand?",
        },
      },
    });
    expect(result.answers.mentioned.probability).toBe(0.9);
  }
);
