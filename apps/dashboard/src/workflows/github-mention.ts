import type { GitHubMentionContext } from "@notra/ai/types/github-mention";
import { getWorkflowMetadata } from "workflow";

import {
  claimGitHubMentionStep,
  completeGitHubMentionStep,
  logGitHubMentionResultStep,
  processGitHubMentionStep,
} from "./steps/github-mention-step";

export async function githubMentionWorkflow(context: GitHubMentionContext) {
  "use workflow";
  const { workflowRunId } = getWorkflowMetadata();
  if (!(await claimGitHubMentionStep(context, workflowRunId))) {
    return;
  }
  const startedAt = Date.now();
  let result;
  try {
    result = await processGitHubMentionStep(context);
  } catch (error) {
    // The processing attempt may have reached GitHub before interruption.
    // Keep its claim and expose the failure instead of blindly replaying it.
    await logGitHubMentionResultStep(
      context,
      {
        status: "failed",
        reason:
          "Mention processing was interrupted; check GitHub before retrying with a new mention.",
      },
      Date.now() - startedAt
    );
    throw error;
  }
  await completeGitHubMentionStep(context, workflowRunId);
  await logGitHubMentionResultStep(context, result, Date.now() - startedAt);
  return result;
}
