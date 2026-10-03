export interface ScheduledPublicationPost {
  contentType: string;
  title: string;
  slug: string | null;
  markdown: string | null;
  githubPublish: unknown;
}

/** A pull request a scheduled GitHub destination pushed. */
export interface ScheduledPullRequest {
  pullRequestNumber: number;
  pullRequestUrl: string;
  headSha: string | null;
}

export interface ScheduledPublicationWorkflowInput {
  scheduledPublicationId: string;
  claimToken: string;
}

export interface ScheduledPublicationSweepResult {
  claimed: number;
  started: number;
  released: number;
}
