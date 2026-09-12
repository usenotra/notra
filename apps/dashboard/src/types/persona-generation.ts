export interface PersonaGenerationJob {
  id: string;
  organizationId: string;
  projectId: string;
  personaId?: string;
  brief?: string;
  status: "queued" | "running" | "completed" | "failed";
  startedAt: string;
  runId: string | null;
  error: string | null;
}

export type PersonaGenerationRequest = string | { brief: string } | void;
