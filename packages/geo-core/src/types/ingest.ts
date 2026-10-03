import type { GeoTrafficEventRow } from "@notra/analytics/tinybird/datasources";
import type { GeoRequestPayload } from "@usenotra/geo";

import type { GeoIngestIdentity, GeoVisitorType } from "./geo";

export type GeoIngestDefer = (task: () => Promise<void>) => void;

export interface GeoIngestAnalyticsInput {
  identity: GeoIngestIdentity;
  event: GeoTrafficEventRow;
}

export interface GeoVisitorSignals {
  clientHints: boolean;
  fetchMode: string | null;
  tracing: boolean;
}

export interface GeoVisitorInput {
  userAgent: string | undefined;
  referer: string | undefined;
  accept: string | undefined;
  signals?: GeoVisitorSignals;
}

export interface GeoVisitorClassification {
  visitorType: GeoVisitorType;
  source: string;
  agent: string;
  category: string;
  confidence: string;
}

export interface GeoJourneyInput {
  url: URL;
  source: string;
  ip: string | undefined;
  capturedAt: Date;
  visitorType: GeoVisitorType;
  category: string;
}

export interface GeoJourneyTuning {
  bucketSeconds: number;
  fullIp: boolean;
}

export interface GeoTrafficEventInput {
  organizationId: string;
  projectId: string | null;
  payload: GeoRequestPayload;
  url: URL;
  capturedAt: Date;
  classification: GeoVisitorClassification;
  journey: GeoJourneyResolution;
}

export interface GeoJourneyResolution {
  journeyId: string;
  path: string;
}

export type GeoIngestDropReason = "visitor_type" | "host";

export type GeoIngestResult =
  | {
      outcome: "ingested";
      organizationId: string;
      projectId: string | null;
      visitorType: GeoVisitorType;
      source: string;
      agent: string;
      ingestMs: number;
    }
  | {
      outcome: "dropped";
      reason: GeoIngestDropReason;
      organizationId: string;
      projectId: string | null;
      visitorType: GeoVisitorType;
      host?: string;
    };

export type GeoIngestRuntime = "railway" | "vercel" | "local";
