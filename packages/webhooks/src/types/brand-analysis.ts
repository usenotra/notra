export interface BrandAnalysisOutcome {
  readonly id: string;
  readonly organizationId: string;
  readonly brandIdentityId: string;
  readonly status: "queued" | "running" | "completed" | "failed";
  readonly error: string | null;
}
