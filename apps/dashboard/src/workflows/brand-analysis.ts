import { publicWebsiteUrlSchema } from "@notra/geo-core/schemas/url";
import { flattenError, object, string } from "zod";

import type { BrandAnalysisPayload } from "@/types/brand-analysis";
import type { LogRetentionDays } from "@/types/webhooks/webhooks";
import type { BrandAnalysisWorkflowResult } from "@/types/workflows/brand-analysis";

import {
  extractBrandInfo,
  saveBrandSettingsFromAnalysis,
  scrapeBrandWebsite,
  setBrandAnalysisProgress,
} from "./steps/brand-analysis-steps";
import {
  appendAutomationLogBestEffort,
  fetchLogRetention,
} from "./steps/content-generation-steps";

const STEP_COUNT = 3;

export const brandAnalysisPayloadSchema = object({
  organizationId: string().min(1),
  url: publicWebsiteUrlSchema,
  voiceId: string().optional(),
  jobId: string().optional(),
});

interface BrandAnalysisLogContext {
  organizationId: string;
  url: string;
  voiceId?: string;
  jobId?: string;
  retentionDays: LogRetentionDays;
}

/**
 * Records the analysis outcome in the organization activity log. The progress
 * state above powers the live UI only; without a log entry there is no
 * durable record of what ran or why it failed.
 */
async function logBrandAnalysisRun(
  context: BrandAnalysisLogContext,
  outcome:
    | { status: "success"; companyName?: string }
    | { status: "failed"; stage: string; errorMessage: string }
): Promise<void> {
  await appendAutomationLogBestEffort({
    organizationId: context.organizationId,
    integrationId: context.voiceId ?? context.organizationId,
    integrationType: "brand",
    title:
      outcome.status === "success"
        ? `Brand analysis completed${outcome.companyName ? ` for ${outcome.companyName}` : ""}`
        : "Brand analysis failed",
    status: outcome.status,
    payload: {
      url: context.url,
      ...(outcome.status === "failed" ? { stage: outcome.stage } : {}),
    },
    ...(outcome.status === "failed"
      ? { errorMessage: outcome.errorMessage }
      : {}),
    ...(context.jobId ? { referenceId: context.jobId } : {}),
    retentionDays: context.retentionDays,
  });
}

export async function brandAnalysisWorkflow(
  payload: BrandAnalysisPayload
): Promise<BrandAnalysisWorkflowResult> {
  "use workflow";

  const parseResult = brandAnalysisPayloadSchema.safeParse(payload);
  if (!parseResult.success) {
    console.error(
      "[Brand Analysis] Invalid payload:",
      flattenError(parseResult.error)
    );
    return { status: "invalid_payload" };
  }
  const { organizationId, url, voiceId, jobId } = parseResult.data;
  const workflowStartedAt = Date.now();
  const retentionDays = await fetchLogRetention(organizationId);
  const logContext: BrandAnalysisLogContext = {
    organizationId,
    url,
    retentionDays,
    ...(voiceId ? { voiceId } : {}),
    ...(jobId ? { jobId } : {}),
  };

  try {
    await setBrandAnalysisProgress({
      organizationId,
      jobId,
      startedAt: workflowStartedAt,
      progress: { status: "scraping", currentStep: 1, totalSteps: STEP_COUNT },
    });

    const scrapingResult = await scrapeBrandWebsite(url);
    if (!scrapingResult.success) {
      await setBrandAnalysisProgress({
        organizationId,
        jobId,
        startedAt: workflowStartedAt,
        progress: {
          status: "failed",
          currentStep: 1,
          totalSteps: STEP_COUNT,
          error: scrapingResult.error,
        },
      });
      await logBrandAnalysisRun(logContext, {
        status: "failed",
        stage: "scraping",
        errorMessage: scrapingResult.error,
      });
      return { status: "scraping_failed" };
    }

    await setBrandAnalysisProgress({
      organizationId,
      jobId,
      startedAt: workflowStartedAt,
      progress: {
        status: "extracting",
        currentStep: 2,
        totalSteps: STEP_COUNT,
      },
    });

    const extractionResult = await extractBrandInfo({
      content: scrapingResult.content,
      organizationId,
      jobId,
      voiceId,
    });
    if (!extractionResult.success) {
      await setBrandAnalysisProgress({
        organizationId,
        jobId,
        startedAt: workflowStartedAt,
        progress: {
          status: "failed",
          currentStep: 2,
          totalSteps: STEP_COUNT,
          error: extractionResult.error,
        },
      });
      await logBrandAnalysisRun(logContext, {
        status: "failed",
        stage: "extraction",
        errorMessage: extractionResult.error,
      });
      return { status: "extraction_failed" };
    }

    await setBrandAnalysisProgress({
      organizationId,
      jobId,
      startedAt: workflowStartedAt,
      progress: { status: "saving", currentStep: 3, totalSteps: STEP_COUNT },
    });

    await saveBrandSettingsFromAnalysis({
      organizationId,
      voiceId,
      url,
      brandInfo: extractionResult.brandInfo,
    });

    await setBrandAnalysisProgress({
      organizationId,
      jobId,
      startedAt: workflowStartedAt,
      progress: {
        status: "completed",
        currentStep: 3,
        totalSteps: STEP_COUNT,
      },
    });

    await logBrandAnalysisRun(logContext, {
      status: "success",
      ...(extractionResult.brandInfo.companyName
        ? { companyName: extractionResult.brandInfo.companyName }
        : {}),
    });

    return { status: "completed", brandInfo: extractionResult.brandInfo };
  } catch (error) {
    await setBrandAnalysisProgress({
      organizationId,
      jobId,
      startedAt: workflowStartedAt,
      progress: {
        status: "failed",
        currentStep: 0,
        totalSteps: STEP_COUNT,
        error: "Workflow failed unexpectedly",
      },
    });
    await logBrandAnalysisRun(logContext, {
      status: "failed",
      stage: "unexpected",
      errorMessage: "Workflow failed unexpectedly",
    });
    console.error(
      `[Brand Analysis] Workflow failed for organization ${organizationId}`
    );
    throw error;
  }
}
