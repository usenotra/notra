import type { PublicationRepairScheduler } from "@notra/ai/types/content-publication";
import type {
  GitHubMentionContext,
  GitHubMentionOctokit,
  GitHubMentionWriteTarget,
} from "@notra/ai/types/github-mention";

export interface GitHubMentionMoveParams {
  octokit: GitHubMentionOctokit;
  context: GitHubMentionContext;
  target: GitHubMentionWriteTarget;
  fromPath: string;
  toPath: string;
  headline: string;
  onCommitted: (sha: string) => void;
  scheduleRepair?: PublicationRepairScheduler;
}
