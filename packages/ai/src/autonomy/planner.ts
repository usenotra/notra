import { IrisPlannerError } from "@notra/ai/autonomy/errors";
import { validatePlannerOutputAgainstMandate } from "@notra/ai/autonomy/validate-plan";
import { AGENT_DEFAULT_MODEL } from "@notra/ai/constants/models";
import { gateway } from "@notra/ai/gateway";
import {
  buildIrisPlannerRepairPrompt,
  buildIrisPlannerSystemPrompt,
  buildIrisPlannerUserPrompt,
} from "@notra/ai/prompts/iris-planner";
import { withRouterDefaults } from "@notra/ai/provider-options";
import { irisTaskParamSchemas } from "@notra/ai/schemas/autonomy/capability-params";
import {
  type PlannerOutput,
  plannerOutputSchema,
} from "@notra/ai/schemas/autonomy/planner";
import { plannerDraftOutputSchema } from "@notra/ai/schemas/autonomy/planner-draft";
import type {
  IrisPlannerInput,
  IrisPlannerResult,
} from "@notra/ai/types/autonomy-capabilities";
import { computeStableInputHash } from "@notra/ai/utils/autonomy-hash";
import { irisTextCostCents } from "@notra/ai/utils/iris-usage";
import { generateText, Output } from "ai";
import { Effect } from "effect";

const PLANNER_MAX_OUTPUT_TOKENS = 4000;
const PLANNER_TEMPERATURE = 0.2;
const PLANNER_REPAIR_ATTEMPTS = 1;

export const IRIS_PLANNER_MODEL_ID = AGENT_DEFAULT_MODEL;

const buildPlannerInputFingerprint = (input: IrisPlannerInput) => ({
  modelId: IRIS_PLANNER_MODEL_ID,
  mandate: {
    id: input.mandate.id,
    version: input.mandate.version,
    objective: input.mandate.objective,
    policy: input.mandate.policy,
    status: input.mandate.status,
  },
  signalSummaries: input.signalSummaries,
  recentActionSummaries: input.recentActionSummaries,
  capabilities: input.capabilityCatalog.map((capability) => ({
    name: capability.name,
    version: capability.version,
  })),
});

const generatePlannerDraft = Effect.fn("iris.planner.generate")(function* (
  prompt: string,
  organizationId: string
) {
  const generated = yield* Effect.tryPromise({
    try: async () => {
      const result = await generateText({
        model: gateway(IRIS_PLANNER_MODEL_ID, {
          organizationId,
        }),
        output: Output.object({ schema: plannerDraftOutputSchema }),
        system: buildIrisPlannerSystemPrompt(),
        prompt,
        temperature: PLANNER_TEMPERATURE,
        maxOutputTokens: PLANNER_MAX_OUTPUT_TOKENS,
        providerOptions: withRouterDefaults(undefined, {
          modelId: IRIS_PLANNER_MODEL_ID,
        }),
      });
      return { output: result.output, usage: result.usage };
    },
    catch: (cause) =>
      new IrisPlannerError({
        message: "The planner model call failed",
        violations: [],
        costCents: 0,
        cause,
      }),
  });

  return {
    draft: generated.output,
    costCents: irisTextCostCents(generated.usage, IRIS_PLANNER_MODEL_ID),
  };
});

interface PlannerValidation {
  output: PlannerOutput | null;
  errors: string[];
  cause: unknown;
}

const describeIssue = (issue: { path: PropertyKey[]; message: string }) =>
  `${issue.path.join(".") || "output"}: ${issue.message}`;

const collectTaskParamErrors = (output: PlannerOutput): string[] => {
  const errors: string[] = [];

  for (const [index, task] of output.tasks.entries()) {
    const schema = irisTaskParamSchemas[task.capabilityName];
    if (!schema) {
      continue;
    }

    const parsed = schema.safeParse(task.params);
    if (parsed.success) {
      continue;
    }

    for (const issue of parsed.error.issues) {
      errors.push(
        describeIssue({
          path: ["tasks", index, "params", ...issue.path],
          message: issue.message,
        })
      );
    }
  }

  return errors;
};

const collectCapabilityCatalogErrors = (
  output: PlannerOutput,
  input: IrisPlannerInput
): string[] => {
  const supportedVersions = new Map(
    input.capabilityCatalog.map((capability) => [
      capability.name,
      capability.version,
    ])
  );

  const errors: string[] = [];
  for (const task of output.tasks) {
    const supportedVersion = supportedVersions.get(task.capabilityName);
    if (supportedVersion === undefined) {
      errors.push(
        `tasks.${task.localId}: capability "${task.capabilityName}" is not in the catalog`
      );
      continue;
    }
    if (supportedVersion !== task.capabilityVersion) {
      errors.push(
        `tasks.${task.localId}: capability "${task.capabilityName}" version ${task.capabilityVersion} is not implemented, the catalog provides version ${supportedVersion}`
      );
    }
  }

  return errors;
};

const validatePlannerDraft = (
  draft: unknown,
  input: IrisPlannerInput
): PlannerValidation => {
  const parsed = plannerOutputSchema.safeParse(draft);
  if (!parsed.success) {
    return {
      output: null,
      errors: parsed.error.issues.map(describeIssue),
      cause: parsed.error,
    };
  }

  const errors = [
    ...validatePlannerOutputAgainstMandate(parsed.data, input.mandate),
    ...collectCapabilityCatalogErrors(parsed.data, input),
    ...collectTaskParamErrors(parsed.data),
  ];
  if (errors.length > 0) {
    return { output: null, errors, cause: null };
  }

  return { output: parsed.data, errors: [], cause: null };
};

export const invokeIrisPlanner = Effect.fn("iris.planner.invoke")(function* (
  input: IrisPlannerInput
) {
  const inputHash = computeStableInputHash(buildPlannerInputFingerprint(input));
  const basePrompt = buildIrisPlannerUserPrompt(input);

  yield* Effect.annotateLogs(Effect.logInfo("iris.planner.invoking"), {
    mandateId: input.mandate.id,
    mandateVersion: input.mandate.version,
    signalCount: input.signalSummaries.length,
    inputHash,
  });

  let prompt = basePrompt;
  let costCents = 0;
  let validation: PlannerValidation = {
    output: null,
    errors: ["The planner produced no output"],
    cause: null,
  };

  for (let attempt = 0; attempt <= PLANNER_REPAIR_ATTEMPTS; attempt++) {
    const attemptCostCents = costCents;
    const generated = yield* generatePlannerDraft(
      prompt,
      input.mandate.organizationId
    ).pipe(
      Effect.catch((error) =>
        Effect.fail(
          new IrisPlannerError({
            message: error.message,
            violations: error.violations,
            costCents: attemptCostCents + error.costCents,
            cause: error.cause,
          })
        )
      )
    );
    costCents += generated.costCents;
    validation = validatePlannerDraft(generated.draft, input);

    if (validation.output) {
      break;
    }

    yield* Effect.annotateLogs(
      Effect.logWarning("iris.planner.outputRejected"),
      {
        mandateId: input.mandate.id,
        attempt: attempt + 1,
        errors: validation.errors.join("; "),
      }
    );

    if (attempt >= PLANNER_REPAIR_ATTEMPTS) {
      break;
    }

    prompt = buildIrisPlannerRepairPrompt({
      basePrompt,
      previousOutput: generated.draft,
      errors: validation.errors,
    });
  }

  const output = validation.output;
  if (!output) {
    return yield* Effect.fail(
      new IrisPlannerError({
        message: "Planner output failed validation after the repair attempt",
        violations: validation.errors,
        costCents,
        cause: validation.cause,
      })
    );
  }

  yield* Effect.annotateLogs(Effect.logInfo("iris.planner.decided"), {
    mandateId: input.mandate.id,
    decision: output.decision,
    taskCount: output.tasks.length,
    costCents,
    inputHash,
  });

  return { output, inputHash, costCents } satisfies IrisPlannerResult;
});
