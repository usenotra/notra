import type { BrandAnalysisJob } from "@notra/ai/jobs/brand-analysis";
import {
  InternalDashboardAdapterError,
  InternalDashboardError,
} from "@notra/schemas/api/internal-dashboard";

import {
  getInternalWorkflowUrl,
  startDashboardWorkflow,
} from "./internal-workflow";

interface BrandAnalysisEnv {
  WORKFLOW_BASE_URL?: string;
}

function getBrandAnalysisWorkflowUrl(env: BrandAnalysisEnv) {
  return getInternalWorkflowUrl(env, "/api/internal/workflows/brand-analysis");
}

export function isBrandAnalysisConfigured(env: BrandAnalysisEnv) {
  return !!getBrandAnalysisWorkflowUrl(env);
}

/** True when the dashboard explicitly rejected the workflow before acceptance. */
export function isConfirmedWorkflowTriggerRejection(error: unknown) {
  if (error instanceof InternalDashboardError) {
    return error.status >= 400 && error.status < 500;
  }

  if (error instanceof InternalDashboardAdapterError) {
    return error.kind === "configuration" || error.kind === "authentication";
  }

  if (
    error instanceof Error &&
    error.message === "Brand analysis workflow URL is not configured"
  ) {
    return true;
  }

  return false;
}

export async function triggerBrandAnalysisWorkflow(
  env: BrandAnalysisEnv,
  payload: {
    organizationId: string;
    url: string;
    voiceId: string;
    jobId: BrandAnalysisJob["id"];
  }
) {
  const url = getBrandAnalysisWorkflowUrl(env);

  if (!url) {
    throw new Error("Brand analysis workflow URL is not configured");
  }

  return await startDashboardWorkflow(url, payload);
}
