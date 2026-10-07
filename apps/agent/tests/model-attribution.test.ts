import { expect, mock, test } from "bun:test";

import {
  Experimental_EvaluationMockModelV4 as EvaluationMockModelV4,
  MockLanguageModelV4,
} from "ai/test";

const actualAi = await import("ai");
const actualContext = await import("eve/context");
const models = new Map<string, MockLanguageModelV4>();
const evaluation = mock<EvaluationMockModelV4["doEvaluate"]>(async () => ({
  answers: { route: { type: "choice", choice: "openai/gpt-6-luna" } },
  warnings: [],
}));
const evaluator = new EvaluationMockModelV4({
  modelId: "typesafe-ai/jev",
  doEvaluate: evaluation,
});
mock.module("ai", () => ({
  ...actualAi,
  gateway: Object.assign(
    (modelId: string) => {
      const model = new MockLanguageModelV4({
        modelId,
        doGenerate: async () => ({
          content: [{ type: "text", text: "mock" }],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 1, text: 1, reasoning: 0 },
          },
          warnings: [],
        }),
      });
      models.set(modelId, model);
      return model;
    },
    { evaluationModel: () => evaluator }
  ),
}));
mock.module("eve/context", () => ({
  ...actualContext,
  defineState: (_name: string, initial: () => unknown) => {
    let value = initial();
    return {
      get: () => value,
      update: (update: (value: unknown) => unknown) => {
        value = update(value);
      },
    };
  },
}));
const { autoModel: actualAutoModel } =
  await import("eve/experimental/evaluate");
mock.module("eve/experimental/evaluate", () => ({
  autoModel: (config: Parameters<typeof actualAutoModel>[0]) => ({
    kind: "eve:dynamic",
    events: {
      "step.started": async () => {
        if (!config.model) {
          throw new Error("Expected an attributed evaluation model");
        }
        const result = await actualAi.experimental_evaluate({
          model: typeof config.model === "string" ? evaluator : config.model,
          providerOptions: config.providerOptions,
          state: "mock routing question",
          questions: {
            route: {
              type: "choice",
              instructions: "Choose",
              criteria: { "openai/gpt-6-luna": "Fast" },
            },
          },
        });
        const choice = config.options[result.answers.route.choice];
        if (!choice || typeof choice === "string") {
          throw new Error("Expected a configured model instance");
        }
        return { model: choice.model, reasoning: choice.reasoning };
      },
    },
  }),
}));
const { createAssistantModel } = await import("../agent/lib/utils/model");
const { createSessionAgentModel } =
  await import("../agent/lib/utils/session-model");

test("chat routing attributes both Jev and the selected language model per organization", async () => {
  const old = process.env.NOTRA_JEV_CLASSIFIERS;
  process.env.NOTRA_JEV_CLASSIFIERS = "true";
  try {
    const step = createAssistantModel().events["step.started"];
    expect(step).toBeDefined();
    for (const organizationId of ["org-a", "org-b"]) {
      const selected = await Reflect.apply(step, undefined, [
        { data: { turnId: organizationId } },
        {
          session: {
            id: organizationId,
            auth: {
              current: { attributes: { organizationId } },
              initiator: null,
            },
          },
        },
      ]);
      expect(selected.modelOptions.providerOptions.gateway.user).toBe(
        organizationId
      );
      expect(
        evaluation.mock.calls.at(-1)?.[0].providerOptions?.gateway
      ).toMatchObject({
        user: organizationId,
        tags: ["evaluation-agent-model"],
        zeroDataRetention: true,
        disallowPromptTraining: true,
      });
      await selected.model.doGenerate({
        prompt: [{ role: "user", content: [{ type: "text", text: "mock" }] }],
        providerOptions: selected.modelOptions.providerOptions,
      });
      expect(
        models.get(selected.model.modelId)?.doGenerateCalls.at(-1)
          ?.providerOptions?.gateway
      ).toMatchObject({ user: organizationId, tags: ["agent-chat"] });
    }
  } finally {
    if (old === undefined) {
      delete process.env.NOTRA_JEV_CLASSIFIERS;
    } else {
      process.env.NOTRA_JEV_CLASSIFIERS = old;
    }
  }
});

test.each([
  "agent-task",
  "content-writer-agent",
  "content-code-researcher",
  "content-image-designer",
])(
  "fixed %s models attribute the active session without changing their context window",
  async (tag) => {
    const definition = createSessionAgentModel(
      "openai/gpt-6-sol",
      tag,
      1_050_000
    );
    const step = definition.events["step.started"];
    for (const organizationId of ["org-a", "org-b"]) {
      const selected = await Reflect.apply(step, undefined, [
        {},
        {
          session: {
            id: "session",
            auth: {
              current: null,
              initiator: { attributes: { organizationId } },
            },
          },
        },
      ]);
      expect(selected.modelContextWindowTokens).toBe(1_050_000);
      await selected.model.doGenerate({
        prompt: [{ role: "user", content: [{ type: "text", text: "mock" }] }],
        providerOptions: selected.modelOptions.providerOptions,
      });
      expect(
        models.get(selected.model.modelId)?.doGenerateCalls.at(-1)
          ?.providerOptions?.gateway
      ).toMatchObject({ user: organizationId, tags: [tag] });
    }
  }
);

test("task and classifier-disabled chat branches also receive organization attribution", async () => {
  const old = process.env.NOTRA_JEV_CLASSIFIERS;
  process.env.NOTRA_JEV_CLASSIFIERS = "off";
  try {
    const step = createAssistantModel().events["step.started"];
    for (const surface of ["task", "chat"]) {
      const selected = await Reflect.apply(step, undefined, [
        { data: { turnId: surface } },
        {
          session: {
            id: "session",
            auth: {
              current: { attributes: { organizationId: "org-test", surface } },
              initiator: null,
            },
          },
        },
      ]);
      expect(selected.modelOptions.providerOptions.gateway.user).toBe(
        "org-test"
      );
      expect(selected.model.modelId).toBe(
        surface === "task" ? "openai/gpt-6-sol" : "anthropic/claude-sonnet-5.5"
      );
    }
  } finally {
    if (old === undefined) {
      delete process.env.NOTRA_JEV_CLASSIFIERS;
    } else {
      process.env.NOTRA_JEV_CLASSIFIERS = old;
    }
  }
});

test("research-only sessions do not inherit the previous organization's user", async () => {
  const definition = createSessionAgentModel(
    "anthropic/claude-sonnet-5",
    "content-code-researcher",
    1_000_000
  );
  const selected = await Reflect.apply(
    definition.events["step.started"],
    undefined,
    [
      {},
      {
        session: { id: "research", auth: { current: null, initiator: null } },
      },
    ]
  );
  expect(selected.modelOptions.providerOptions.gateway.user).toBeUndefined();
});
