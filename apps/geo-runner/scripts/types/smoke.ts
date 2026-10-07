export interface SmokeOptions {
  baseUrl: string;
  secret: string;
  organizationId: string;
  projectId: string;
  prompt: string;
  models: string[];
  language: string;
  webSearch: boolean;
  fixture: boolean;
  json: boolean;
  idempotencyKey: string;
  scanId: string | undefined;
  timeoutMs: number;
}

export interface SmokeModel {
  id: string;
  default?: boolean;
  supportsWebSearch?: boolean;
}

export interface SmokeScan {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  errorCode?: string | null;
  errorMessage?: string | null;
  results?: unknown;
}
