import type { BrandGuidelinesWorkflowPayload } from "@notra/ai/types/brand-guidelines";
import { brandGuidelinesWorkflowPayloadSchema } from "@notra/schemas/dashboard/brand-guidelines";
import { flattenError } from "zod";

import {
  WORKFLOW_ANALYTICS_NAMES,
  WORKFLOW_OUTCOMES,
  WORKFLOW_UNEXPECTED_FAILURE_REASON,
} from "@/constants/workflow-analytics";
import {
  BRAND_GUIDELINE_STAGES,
  type BrandGuidelinesWorkflowResult,
} from "@/types/workflows/brand-guidelines";

import {
  markBrandGuidelineStageFailed,
  markBrandGuidelinesGenerating,
  markBrandGuidelinesUnexpectedFailure,
  runBrandGuidelineStage,
} from "./steps/brand-guidelines-steps";
import {
  appendAutomationLogBestEffort,
  fetchLogRetention,
} from "./steps/content-generation-steps";
import { trackWorkflowOutcome } from "./steps/workflow-lifecycle-steps";

export async function brandGuidelinesWorkflow(
  payload: BrandGuidelinesWorkflowPayload
): Promise<BrandGuidelinesWorkflowResult> {
  "use workflow";

  const parseResult = brandGuidelinesWorkflowPayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    console.error(
      "[Brand Guidelines] Invalid payload:",
      flattenError(parseResult.error)
    );
    return { status: "invalid_payload" };
  }
  const { brandSettingsId, organizationId, sourceUrl } = parseResult.data;
  const workflowStartedAt = Date.now();
  const retentionDays = await fetchLogRetention(organizationId);

  try {
    await markBrandGuidelinesGenerating(brandSettingsId);

    for (const stage of BRAND_GUIDELINE_STAGES) {
      const result = await runBrandGuidelineStage({
        stage,
        brandSettingsId,
        sourceUrl,
      });

      if (!result.success) {
        await markBrandGuidelineStageFailed({
          brandSettingsId,
          error: result.error,
        });
        await trackWorkflowOutcome({
          workflow: WORKFLOW_ANALYTICS_NAMES.BRAND_GUIDELINES,
          outcome: WORKFLOW_OUTCOMES.FAILED,
          organizationId,
          startedAt: workflowStartedAt,
          stepFailed: stage,
          reason: result.error,
        });
        await appendAutomationLogBestEffort({
          organizationId,
          integrationId: brandSettingsId,
          integrationType: "brand",
          title: "Brand guidelines generation failed",
          status: "failed",
          errorMessage: result.error,
          payload: { url: sourceUrl, stage },
          retentionDays,
        });
        return { status: "stage_failed", stage };
      }
    }

    await trackWorkflowOutcome({
      workflow: WORKFLOW_ANALYTICS_NAMES.BRAND_GUIDELINES,
      outcome: WORKFLOW_OUTCOMES.COMPLETED,
      organizationId,
      startedAt: workflowStartedAt,
    });
    await appendAutomationLogBestEffort({
      organizationId,
      integrationId: brandSettingsId,
      integrationType: "brand",
      title: "Brand guidelines generated",
      status: "success",
      payload: { url: sourceUrl },
      retentionDays,
    });
    return { status: "completed" };
  } catch (error) {
    await markBrandGuidelinesUnexpectedFailure({
      brandSettingsId,
      organizationId,
    });
    await trackWorkflowOutcome({
      workflow: WORKFLOW_ANALYTICS_NAMES.BRAND_GUIDELINES,
      outcome: WORKFLOW_OUTCOMES.FAILED,
      organizationId,
      startedAt: workflowStartedAt,
      reason: WORKFLOW_UNEXPECTED_FAILURE_REASON,
    });
    await appendAutomationLogBestEffort({
      organizationId,
      integrationId: brandSettingsId,
      integrationType: "brand",
      title: "Brand guidelines generation failed",
      status: "failed",
      errorMessage: WORKFLOW_UNEXPECTED_FAILURE_REASON,
      payload: { url: sourceUrl, stage: "unexpected" },
      retentionDays,
    });
    throw error;
  }
}
