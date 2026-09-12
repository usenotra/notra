import { getWorkflowMetadata } from "workflow";

export function getCurrentWorkflowRunId(): string | undefined {
  try {
    return getWorkflowMetadata().workflowRunId;
  } catch {
    // Lifecycle tracking is also used outside SDK steps. A business execution
    // or job ID must not be mistaken for a Workflow SDK run ID in that case.
    return undefined;
  }
}
