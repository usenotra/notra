import type { demoSandboxes } from "@notra/db/schema";
import type { DemoPersonalization } from "@notra/db/types/demo";

export type DemoSandbox = typeof demoSandboxes.$inferSelect;

export interface DemoSessionPayload {
  anonymousId: string;
}

export interface DemoOrganizationInput {
  anonymousId: string;
  timeZone: string;
  now: Date;
  personalization: DemoPersonalization | null;
}

export interface CreateDemoSandboxInput {
  timeZone: string | null;
  ipHash: string | null;
}

export interface CreatedDemoSandbox {
  anonymousId: string;
  organizationId: string;
  slug: string;
}

export interface DemoSeedContext {
  organizationId: string;
  /** "Fieldnote" unless the visitor customized the demo. */
  companyName: string;
  ownerUserId: string;
  timeZone: string;
  now: Date;
}

export interface DemoSeedResult {
  projectId: string | null;
}

export interface DemoTimestampColumns {
  table: string;
  columns: string[];
}

export interface DemoSandboxCreateResponse {
  anonymousId: string;
  slug: string;
}

// A type alias (not an interface) so it satisfies drizzle's row constraint.
export type DemoTimestampColumnRow = {
  table_name: string;
  columns: string[];
};

export interface DemoUiAction {
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  /** API equivalent; `{placeholders}` are filled from the procedure input. */
  path: string | null;
}

export type DemoMissionId =
  | "scan"
  | "apiPrompt"
  | "agentPost"
  | "schedule"
  | "externalClient";

export interface DemoSandboxInfo {
  anonymousId: string;
  organizationId: string;
  expiresAt: string;
  timeZone: string;
  apiKey: string | null;
  apiBaseUrl: string;
  signupUrl: string;
  projectId: string | null;
  personalization: DemoPersonalization | null;
  missions: Record<DemoMissionId, boolean>;
}

export interface DemoRequestDetail {
  id: string;
  requestBody: string | null;
  responseBody: string | null;
}

export type DemoConsolePresetId =
  | "listPosts"
  | "createPost"
  | "createPrompt"
  | "startScan"
  | "visibility"
  | "traffic"
  | "listSchedules"
  | "createSkill";

export interface DemoConsolePreset {
  id: DemoConsolePresetId;
  section: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: Record<string, unknown>;
}

export interface DemoConsoleResponse {
  status: number;
  durationMs: number;
  body: string;
}

export type DemoPlaygroundTab = "console" | "requests" | "missions";
