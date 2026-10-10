import type { Mandate } from "@notra/ai/schemas/autonomy/mandate";
import type { IrisPlannerResult } from "@notra/ai/types/autonomy-capabilities";

export const baseline = "74c26b099";
export const stepsPath = "apps/dashboard/src/workflows/steps/iris-steps.ts";
export const controllerPath = "apps/dashboard/src/workflows/iris-controller.ts";
export const mandate: Mandate = {
  id: "mandate-fixture",
  organizationId: "org-fixture",
  name: "Fixture mandate",
  objective: "Fixture planning",
  status: "active",
  policy: {
    allowedCapabilities: ["draft_blog_post"],
    allowedDestinations: [],
    maxActionsPerDay: 10,
    maxCostCentsPerDay: 100,
    maxTasksPerPlan: 1,
    autoPublish: false,
  },
  version: 1,
};
export const plannerResult: IrisPlannerResult = {
  output: {
    contractVersion: 1,
    mandate: { mandateId: mandate.id, mandateVersion: mandate.version },
    decision: "no_op",
    reason: "fixture",
    consumedSignalIds: [],
    tasks: [],
  },
  inputHash: "fixture-input-hash",
  costCents: 17,
};
export const artifact = {
  postId: "post-fixture",
  title: "Fixture draft",
  contentType: "blog_post" as const,
  excerpt: "Fixture",
  status: "draft" as const,
};
export const taskInput = {
  organizationId: mandate.organizationId,
  runId: "run-fixture",
  mandate,
  collectionId: "collection-fixture",
  task: {
    taskId: "task-fixture",
    localId: "local-fixture",
    capabilityName: "draft_blog_post",
    capabilityVersion: 1,
    params: {},
    dependsOnTaskIds: [],
  },
  signalContext: { primarySignal: null, summaries: [] },
} satisfies Parameters<
  typeof import("../../src/workflows/steps/iris-steps").runIrisTask
>[0];
