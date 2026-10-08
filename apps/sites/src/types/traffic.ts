export interface TrafficPayload {
  timestamp: string;
  method: string;
  url: string;
  ip?: string;
  geo?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
    latitude?: string;
    longitude?: string;
  };
  referer?: string;
  userAgent?: string;
  accept?: string;
  acceptLanguage?: string;
  requestId?: string;
  status?: number;
  signals: {
    clientHints: boolean;
    fetchMode: string | null;
    prefetch: boolean;
    tracing: boolean;
  };
}

export interface TrafficReport {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  ingestUrl: string;
  token: string;
  request: Request;
  publicUrl: string;
  proxied: boolean;
  status: number;
}

export interface AnalyticsEvent {
  viewId: string;
  path: string;
  visibleMs: number;
  scrollDepth: number;
}

export interface EngagementReport {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  ingestUrl: string;
  token: string;
  publicOrigin: string;
  event: AnalyticsEvent;
}

export interface IngestPost {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  ingestUrl: string;
  token: string;
  kind: "traffic" | "engagement";
  /** Built inside the error boundary so a malformed URL is logged, not thrown. */
  buildBody: () => TrafficPayload | Record<string, unknown>;
}
