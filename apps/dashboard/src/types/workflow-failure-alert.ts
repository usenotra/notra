export interface WorkflowFailureAlertInput {
  websiteUrl?: string;
  runId: string;
  workflow: string;
  organizationId?: string | null;
  projectId?: string | null;
  reason?: string;
}
