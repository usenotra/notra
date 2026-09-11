import { WORKFLOW_ANALYTICS_NAMES } from "@/constants/workflow-analytics";

export const WORKFLOW_MONITORING = {
  pageSize: 50,
  pagesPerStatus: 2,
  stepRunLimit: 10,
  stepsPerRun: 50,
  recentTerminalMs: 30 * 60 * 1000,
  operationTimeoutMs: 5000,
  sweepBudgetMs: 40_000,
};

export const MONITORED_WORKFLOW_STATUSES = [
  "pending",
  "running",
  "failed",
  "cancelled",
  "completed",
] as const;
export const MONITORED_WORKFLOW_NAMES: Record<string, string> = {
  brandAnalysisWorkflow: WORKFLOW_ANALYTICS_NAMES.BRAND_ANALYSIS,
  brandGuidelinesWorkflow: WORKFLOW_ANALYTICS_NAMES.BRAND_GUIDELINES,
  standaloneChatWorkflow: WORKFLOW_ANALYTICS_NAMES.CHAT,
  onboardingAgentWorkflow: WORKFLOW_ANALYTICS_NAMES.ONBOARDING_AGENT,
  irisControllerRun: WORKFLOW_ANALYTICS_NAMES.IRIS_CONTROLLER,
  scheduleContentWorkflow: WORKFLOW_ANALYTICS_NAMES.SCHEDULE_CONTENT,
  eventContentWorkflow: WORKFLOW_ANALYTICS_NAMES.EVENT_CONTENT,
  socialAnalyticsSyncWorkflow: WORKFLOW_ANALYTICS_NAMES.SOCIAL_ANALYTICS_SYNC,
  geoScanWorkflow: WORKFLOW_ANALYTICS_NAMES.GEO_SCAN,
  geoWriterWorkflow: WORKFLOW_ANALYTICS_NAMES.GEO_WRITER,
  agentReadinessWorkflow: WORKFLOW_ANALYTICS_NAMES.AGENT_READINESS,
  gscSyncWorkflow: WORKFLOW_ANALYTICS_NAMES.GSC_SYNC,
  onDemandContentWorkflow: WORKFLOW_ANALYTICS_NAMES.ON_DEMAND_CONTENT,
  contentEmailDigestWorkflow: WORKFLOW_ANALYTICS_NAMES.CONTENT_EMAIL_DIGEST,
};
