export interface WorkflowFailureAlertInput {
  runId: string;
  workflow: string;
  organizationId?: string | null;
  projectId?: string | null;
  reason?: string;
}
