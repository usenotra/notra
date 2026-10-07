import { devToolsMiddleware } from "@ai-sdk/devtools";
import { EVALUATION_MODEL_ID } from "@notra/ai/constants/evaluation";
import { withGatewayAgentOptions } from "@notra/ai/utils/gateway-agent-model";
import { getOrganizationId } from "@notra/tools/utils/organization";
import { gateway, type LanguageModel, wrapLanguageModel } from "ai";
import { defineDynamic } from "eve";
import { defineState } from "eve/context";
import { autoModel } from "eve/experimental/evaluate";

import {
  ASSISTANT_AUTO_MODEL_OPTIONS,
  ASSISTANT_MODEL_ID,
  ASSISTANT_TASK_MODEL_ID,
  AUTO_MODEL_DISABLED_VALUES,
  AUTO_MODEL_FLAG_ENV,
  GPT_6_SOL_CONTEXT_WINDOW_TOKENS,
  SONNET_5_CONTEXT_WINDOW_TOKENS,
} from "../constants/models";

export function createAgentModel(
  modelId: string,
  tag = "agent-chat"
): LanguageModel {
  const tagged = withGatewayAgentOptions(gateway(modelId), tag);
  if (process.env.AI_SDK_DEVTOOLS !== "true") {
    return tagged;
  }

  return wrapLanguageModel({
    model: tagged,
    middleware: devToolsMiddleware(),
  });
}

interface AssistantModelSelection {
  turnId: string;
  modelId: string;
}

// Hooks cannot see which model eve resolved, so billing reads it from here.
const assistantModelSelection = defineState<AssistantModelSelection | null>(
  "notra.assistant-model-selection",
  () => null
);

export function getSelectedAssistantModelId(turnId: string): string {
  const selection = assistantModelSelection.get();
  return selection?.turnId === turnId ? selection.modelId : ASSISTANT_MODEL_ID;
}

function isAutoModelEnabled(): boolean {
  const raw = process.env[AUTO_MODEL_FLAG_ENV]?.trim().toLowerCase();
  return !(raw && AUTO_MODEL_DISABLED_VALUES.has(raw));
}

type DynamicModelResult = Awaited<
  ReturnType<
    NonNullable<ReturnType<typeof autoModel>["events"]["step.started"]>
  >
>;
type ModelSelection = Extract<DynamicModelResult, { reasoning?: unknown }>;

function isModelSelection(
  result: DynamicModelResult
): result is ModelSelection {
  return (
    typeof result === "object" &&
    "model" in result &&
    !("specificationVersion" in result)
  );
}

/** Pins automated tasks and routes chat turns with eve's `autoModel`. */
export function createAssistantModel() {
  const autoOptions = Object.fromEntries(
    Object.entries(ASSISTANT_AUTO_MODEL_OPTIONS).map(
      ([modelId, { description, reasoning }]) => [
        modelId,
        { model: createAgentModel(modelId), description, reasoning },
      ]
    )
  );
  const fallbackModel = createAgentModel(ASSISTANT_MODEL_ID);
  const taskModel = createAgentModel(ASSISTANT_TASK_MODEL_ID, "agent-task");

  return defineDynamic({
    events: {
      "step.started": async (event, ctx) => {
        const organizationId = getOrganizationId(ctx);
        const gatewayOptions: Record<string, string> = {};
        if (organizationId) {
          gatewayOptions.user = organizationId;
        }
        const modelOptions = {
          providerOptions: {
            gateway: gatewayOptions,
          },
        };
        const surface =
          ctx.session.auth.current?.attributes.surface ??
          ctx.session.auth.initiator?.attributes.surface;
        const turnId = (event as { data?: { turnId?: unknown } }).data?.turnId;
        if (surface === "task") {
          if (typeof turnId === "string") {
            assistantModelSelection.update(() => ({
              turnId,
              modelId: ASSISTANT_TASK_MODEL_ID,
            }));
          }
          return {
            model: taskModel,
            reasoning: "low" as const,
            modelContextWindowTokens: GPT_6_SOL_CONTEXT_WINDOW_TOKENS,
            modelOptions,
          };
        }

        if (!isAutoModelEnabled()) {
          return {
            model: fallbackModel,
            modelContextWindowTokens: SONNET_5_CONTEXT_WINDOW_TOKENS,
            modelOptions,
          };
        }

        const auto = autoModel({
          model: EVALUATION_MODEL_ID,
          providerOptions: {
            gateway: {
              ...gatewayOptions,
              tags: ["evaluation-agent-model"],
              zeroDataRetention: true,
              disallowPromptTraining: true,
            },
          },
          options: autoOptions,
        });
        const selectAutoModel = auto.events["step.started"];
        if (!selectAutoModel) {
          throw new Error("autoModel no longer resolves on step.started");
        }
        const selection = await selectAutoModel(event, ctx);
        const normalized = isModelSelection(selection)
          ? selection
          : { model: selection };
        const { modelId } = normalized.model as { modelId?: unknown };
        if (typeof modelId === "string" && typeof turnId === "string") {
          assistantModelSelection.update(() => ({ turnId, modelId }));
        }
        return {
          ...normalized,
          modelContextWindowTokens: SONNET_5_CONTEXT_WINDOW_TOKENS,
          modelOptions,
        };
      },
    },
  });
}
