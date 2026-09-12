import { agentReadinessWorkflowPayloadSchema } from "@notra/geo-core/schemas/agent-readiness";
import type {
  AgentReadinessWorkflowPayload,
  AgentReadinessWorkflowResult,
} from "@notra/geo-core/types/agent-readiness";
import { flattenError } from "zod";

import { runAgentReadinessScanStep } from "./steps/agent-readiness-steps";
import {
  appendAutomationLogBestEffort,
  fetchLogRetention,
} from "./steps/content-generation-steps";

export async function agentReadinessWorkflow(
  payload: AgentReadinessWorkflowPayload
): Promise<AgentReadinessWorkflowResult> {
  "use workflow";

  const parseResult = agentReadinessWorkflowPayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    console.error(
      "[AgentReadiness] Invalid payload:",
      flattenError(parseResult.error)
    );
    return { status: "invalid_payload" };
  }

  const { organizationId, projectId, reportId, targetUrl } = parseResult.data;
  const retentionDays = await fetchLogRetention(organizationId);

  let result: AgentReadinessWorkflowResult;
  try {
    result = await runAgentReadinessScanStep(parseResult.data);
  } catch (error) {
    await appendAutomationLogBestEffort({
      organizationId,
      integrationId: projectId,
      integrationType: "agent-readiness",
      title: "Agent readiness scan failed",
      status: "failed",
      referenceId: reportId,
      errorMessage: "Workflow failed unexpectedly",
      payload: { reportId, url: targetUrl },
      retentionDays,
    });
    throw error;
  }
  if (result.status === "invalid_payload") {
    return result;
  }

  await appendAutomationLogBestEffort({
    organizationId,
    integrationId: projectId,
    integrationType: "agent-readiness",
    title:
      result.status === "completed"
        ? "Agent readiness report generated"
        : "Agent readiness scan failed",
    status: result.status === "completed" ? "success" : "failed",
    referenceId: reportId,
    payload: {
      reportId,
      url: targetUrl,
    },
    ...(result.status === "failed" ? { errorMessage: result.reason } : {}),
    retentionDays,
  });

  return result;
}
