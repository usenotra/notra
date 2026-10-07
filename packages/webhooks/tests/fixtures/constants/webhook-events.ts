export const WEBHOOK_EVENT_FIXTURES = [
  {
    type: "post.generation.completed",
    data: { jobId: "job-one", postId: "post-one" },
  },
  { type: "post.generation.failed", data: { jobId: "job-one", error: null } },
  { type: "post.generation.skipped", data: { jobId: "job-one", reason: null } },
  {
    type: "brand_identity.generation.completed",
    data: { jobId: "job-one", brandIdentityId: "brand-one" },
  },
  {
    type: "brand_identity.generation.failed",
    data: { jobId: "job-one", error: null },
  },
  { type: "post.published", data: { postId: "post-one" } },
  { type: "post.created", data: { postId: "post-one" } },
  { type: "post.updated", data: { postId: "post-one" } },
  { type: "post.deleted", data: { postId: "post-one" } },
  { type: "post.unpublished", data: { postId: "post-one" } },
  {
    type: "geo.scan.completed",
    data: {
      scanId: "scan-one",
      projectId: "project-one",
      runId: null,
      checksTotal: null,
      checksFailed: null,
      mentions: null,
      durationMs: null,
    },
  },
  {
    type: "geo.scan.failed",
    data: {
      scanId: "scan-one",
      projectId: "project-one",
      errorCode: null,
      error: null,
      failedStage: null,
      retryable: null,
    },
  },
] as const;
