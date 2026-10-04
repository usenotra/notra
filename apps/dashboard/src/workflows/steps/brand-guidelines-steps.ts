import "@/workflows/runtime";
import { WORKFLOW_ANALYTICS_NAMES } from "@/constants/workflow-analytics";
import {
  applyBrandGuidelineBrandStep,
  applyBrandGuidelineScreenshotsStep,
  applyBrandGuidelineStyleguideStep,
  markBrandGuidelinesFailed,
  startBrandGuidelineGeneration,
} from "@/lib/brand-guidelines";
import {
  isFinalStepAttempt,
  reportStepError,
} from "@/lib/workflows/step-errors";
import type { BrandGuidelineWorkflowStepResult } from "@/types/brand-guidelines";
import type {
  BrandGuidelineStage,
  BrandGuidelineStageInput,
} from "@/types/workflows/brand-guidelines";

const STAGE_CONFIG: Record<
  BrandGuidelineStage,
  {
    fallbackError: string;
    run: (input: {
      brandSettingsId: string;
      sourceUrl: string;
    }) => Promise<unknown>;
  }
> = {
  styleguide: {
    fallbackError: "Failed to extract colors and typography",
    run: applyBrandGuidelineStyleguideStep,
  },
  "brand-assets": {
    fallbackError: "Failed to retrieve brand assets",
    run: applyBrandGuidelineBrandStep,
  },
  screenshots: {
    fallbackError: "Failed to capture website screenshots",
    run: applyBrandGuidelineScreenshotsStep,
  },
};

export async function markBrandGuidelinesGenerating(
  brandSettingsId: string
): Promise<void> {
  "use step";
  await startBrandGuidelineGeneration(brandSettingsId);
}

export async function runBrandGuidelineStage(
  input: BrandGuidelineStageInput
): Promise<BrandGuidelineWorkflowStepResult> {
  "use step";
  const config = STAGE_CONFIG[input.stage];
  try {
    await config.run({
      brandSettingsId: input.brandSettingsId,
      sourceUrl: input.sourceUrl,
    });
    return { success: true };
  } catch (error) {
    console.error(`[Brand Guidelines] Stage ${input.stage} failed`, error);
    await reportStepError(error, {
      workflow: WORKFLOW_ANALYTICS_NAMES.BRAND_GUIDELINES,
      step: input.stage,
    });
    if (!isFinalStepAttempt()) {
      throw error;
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : config.fallbackError,
    };
  }
}

export async function markBrandGuidelineStageFailed(input: {
  brandSettingsId: string;
  error: string;
}): Promise<void> {
  "use step";
  await markBrandGuidelinesFailed({
    brandSettingsId: input.brandSettingsId,
    error: input.error,
  });
}

export async function markBrandGuidelinesUnexpectedFailure(input: {
  brandSettingsId: string;
  organizationId: string;
}): Promise<void> {
  "use step";
  await markBrandGuidelinesFailed({
    brandSettingsId: input.brandSettingsId,
    error: "Guideline generation failed unexpectedly",
  });
  console.error(
    `[Brand Guidelines] Workflow failed for organization ${input.organizationId}`
  );
}
