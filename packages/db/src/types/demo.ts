import type { DEMO_REQUEST_SOURCES } from "../constants/demo";

export type DemoRequestSource = (typeof DEMO_REQUEST_SOURCES)[number];

export interface DemoAffectedEntity {
  type: string;
  id: string;
  label?: string;
}

export interface DemoPersonalization {
  firstName: string;
  lastName: string;
  companyName: string;
}

export interface DemoRequestEvent {
  id: string;
  source: DemoRequestSource;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  createdAt: string;
  affected: DemoAffectedEntity[];
}

export interface DemoRequestRecordInput {
  organizationId: string;
  source: DemoRequestSource;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  requestBody: string | null;
  responseBody: string | null;
  affected?: DemoAffectedEntity[];
}
