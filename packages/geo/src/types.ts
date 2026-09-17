export type AiAgentCategory =
  | "training-crawler"
  | "search-index"
  | "assistant-browse";

export type AiAgentConfidence = "verified" | "reported" | "heuristic";

type AiAgentMatchMode = "contains" | "exact";

export interface AiAgentSignature {
  agent: string;
  vendor: string;
  category: AiAgentCategory;
  userAgents: string[];
  match?: AiAgentMatchMode;
  confidence: AiAgentConfidence;
  verification: string | null;
  source: string;
}

export interface AiAgentMatch {
  agent: string;
  vendor: string;
  category: AiAgentCategory;
  confidence: AiAgentConfidence;
}

export interface GeoLocation {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  latitude?: string;
  longitude?: string;
}

export interface GeoRequestSignals {
  clientHints: boolean;
  fetchMode: string | null;
  tracing: boolean;
}

export interface GeoRequestPayload {
  timestamp?: string;
  method: string;
  url: string;
  ip?: string;
  geo?: GeoLocation;
  referer?: string;
  userAgent?: string;
  accept?: string;
  acceptLanguage?: string;
  requestId?: string;
  signals?: GeoRequestSignals;
}

export interface TagMarkdownLinksOptions {
  host?: string;
}

export interface TagHtmlLinksOptions {
  host?: string;
}

export type GeoPathRule =
  | string
  | RegExp
  | ((request: Request, url: URL) => boolean);

export type GeoExcludeRule = GeoPathRule;

export interface GeoTagLinksConfig {
  host?: string;
  paths?: (string | RegExp)[];
  html?: boolean;
}

export type GeoTagLinksOption = boolean | GeoTagLinksConfig;

export interface GeoTagResponseOptions {
  fetch?: typeof fetch;
  onError?: (error: unknown) => void;
  exclude?: GeoExcludeRule[];
}

export type GeoTagMode = "markdown" | "html";

export interface GeoTrackerOptions {
  token: string;
  endpoint?: string;
  exclude?: GeoExcludeRule[];
  sample?: number;
  onError?: (error: unknown) => void;
  fetch?: typeof fetch;
}

export interface GeoNextOptions extends GeoTrackerOptions {
  tagLinks?: GeoTagLinksOption;
}

export interface WaitUntilContext {
  waitUntil(promise: Promise<unknown>): void;
}

export interface NetlifyGeoContext {
  city?: string;
  country?: { code?: string };
  subdivision?: { code?: string };
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

export interface NetlifyContext {
  waitUntil?(promise: Promise<unknown>): void;
  geo?: NetlifyGeoContext;
}

export interface NodeRequestLike {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
}

export interface NitroEventLike {
  node?: { req: NodeRequestLike };
  request?: Request;
}

export interface TanStackMiddlewareContext<T> {
  request: Request;
  next(): T | Promise<T>;
}
