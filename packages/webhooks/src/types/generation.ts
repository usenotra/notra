export interface GenerationOutcome {
  readonly id: string;
  readonly organizationId: string;
  readonly status: "queued" | "running" | "completed" | "failed" | "skipped";
  readonly postId: string | null;
  readonly error: string | null;
}
