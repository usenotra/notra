import { afterEach, beforeEach, expect, mock, test } from "bun:test";

import { gateway } from "ai";
import type { WorkflowToolContext } from "eve/tools";

import {
  ASSISTANT_MODEL_ID,
  AUTO_MODEL_FLAG_ENV,
} from "../agent/lib/constants/models";
import type { ContentTaskResult } from "../agent/lib/types/content-task";
import generateContent from "../agent/tools/generate_content";
import {
  savedContentResult,
  taskModelContext,
  taskPrincipal,
} from "./constants/task-execution";

const eveContext = await import("eve/context");
let selection: unknown = null;
const classifier = mock(() =>
  Promise.resolve({ model: gateway(ASSISTANT_MODEL_ID), reasoning: "low" })
);

mock.module("eve/context", () => ({
  ...eveContext,
  defineState: () => ({
    get: () => selection,
    update: (update: (value: unknown) => unknown) => {
      selection = update(selection);
    },
  }),
}));
mock.module("eve/experimental/evaluate", () => ({
  autoModel: () => ({ events: { "step.started": classifier } }),
}));

const { createAssistantModel, getSelectedAssistantModelId } =
  await import("../agent/lib/utils/model");
const resolveModel = createAssistantModel().events["step.started"];
if (!resolveModel) {
  throw new Error("Assistant model has no step resolver");
}
const originalFlag = process.env[AUTO_MODEL_FLAG_ENV];

beforeEach(() => {
  selection = null;
  classifier.mockClear();
});

afterEach(() => {
  if (originalFlag === undefined) {
    delete process.env[AUTO_MODEL_FLAG_ENV];
  } else {
    process.env[AUTO_MODEL_FLAG_ENV] = originalFlag;
  }
});

test("content tasks wait for the writer's final result", async () => {
  let finishWriter!: (result: ContentTaskResult) => void;
  const writer = new Promise<ContentTaskResult>((resolve) => {
    finishWriter = resolve;
  });
  const agent = mock(() => writer);
  let settled = false;
  const pending = Promise.resolve(
    generateContent.execute({ message: "Write a changelog." }, {
      agent,
    } as unknown as WorkflowToolContext)
  ).then((result) => {
    settled = true;
    return result;
  });

  await Promise.resolve();
  expect(settled).toBe(false);
  expect(generateContent.execution).toBeUndefined();
  expect(agent).toHaveBeenCalledTimes(1);
  expect(agent).toHaveBeenCalledWith("content-writer", {
    message: "Write a changelog.",
  });

  finishWriter(savedContentResult);
  expect(await pending).toEqual(savedContentResult);
});

test("content tasks reject working receipts and propagate writer failures", async () => {
  await expect(
    generateContent.execute({ message: "Write a changelog." }, {
      agent: () => Promise.resolve({ status: "working", taskId: "task-test" }),
    } as unknown as WorkflowToolContext)
  ).rejects.toThrow();

  await expect(
    generateContent.execute({ message: "Write a changelog." }, {
      agent: () => Promise.reject(new Error("Source lookup failed")),
    } as unknown as WorkflowToolContext)
  ).rejects.toThrow("Source lookup failed");
});

test.each(["on", "off", "false", "0"])(
  "task routing and billing stay on GPT-6 Sol when classification is %s",
  async (flag) => {
    process.env[AUTO_MODEL_FLAG_ENV] = flag;
    const result = await resolveModel(
      { data: { turnId: "turn-task" } },
      taskModelContext
    );
    expect(result).toMatchObject({
      model: { modelId: "openai/gpt-6-sol" },
      reasoning: "low",
      modelContextWindowTokens: 1_050_000,
    });
    expect(getSelectedAssistantModelId("turn-task")).toBe("openai/gpt-6-sol");
    expect(classifier).not.toHaveBeenCalled();
  }
);

test("task routing inherits the initiating caller's surface on continuation", async () => {
  process.env[AUTO_MODEL_FLAG_ENV] = "off";
  const result = await resolveModel(
    { data: { turnId: "turn-continuation" } },
    {
      ...taskModelContext,
      session: {
        ...taskModelContext.session,
        auth: {
          current: null,
          initiator: taskModelContext.session.auth.current,
        },
      },
    }
  );
  expect(result).toMatchObject({ model: { modelId: "openai/gpt-6-sol" } });
  expect(getSelectedAssistantModelId("turn-continuation")).toBe(
    "openai/gpt-6-sol"
  );
  expect(classifier).not.toHaveBeenCalled();
});

test.each(["standalone-chat", "content-editor"])(
  "%s keeps classification and does not inherit a task model from the initiator",
  async (surface) => {
    process.env[AUTO_MODEL_FLAG_ENV] = "on";
    const result = await resolveModel(
      { data: { turnId: "turn-chat" } },
      {
        ...taskModelContext,
        session: {
          ...taskModelContext.session,
          auth: {
            current: {
              ...taskPrincipal,
              attributes: { surface },
            },
            initiator: taskModelContext.session.auth.current,
          },
        },
      }
    );
    expect(result).toMatchObject({ model: { modelId: ASSISTANT_MODEL_ID } });
    expect(getSelectedAssistantModelId("turn-chat")).toBe(ASSISTANT_MODEL_ID);
    expect(classifier).toHaveBeenCalledTimes(1);
  }
);

test("chat uses its fallback when classification is disabled", async () => {
  process.env[AUTO_MODEL_FLAG_ENV] = "off";
  const result = await resolveModel(
    { data: { turnId: "turn-fallback" } },
    {
      ...taskModelContext,
      session: {
        ...taskModelContext.session,
        auth: { current: null, initiator: null },
      },
    }
  );
  expect(result).toMatchObject({ model: { modelId: ASSISTANT_MODEL_ID } });
  expect(getSelectedAssistantModelId("turn-fallback")).toBe(ASSISTANT_MODEL_ID);
  expect(classifier).not.toHaveBeenCalled();
});
