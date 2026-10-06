export interface SiteBucketObject {
  body: ReadableStream | null;
  text(): Promise<string>;
}

export interface SiteBucket {
  get(key: string): Promise<SiteBucketObject | null>;
}

export interface SiteEdgeCache {
  match(key: string): Promise<Response | undefined>;
  put(key: string, response: Response): Promise<void>;
}

export interface SitesEnv {
  SITES_BUCKET: R2Bucket;
  HOSTING_DOMAIN: string;
  DASHBOARD_URL: string;
  PREVIEW_SECRET: string;
  DEV_HOST_OVERRIDE_TOKEN?: string;
  PREVIEW_PASSWORD_LIMITER?: RateLimit;
  TRAFFIC_INGEST_URL?: string;
}

export interface PasswordAttemptLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface SitesDeps {
  bucket: SiteBucket;
  cache: SiteEdgeCache | null;
  hostingDomain: string;
  dashboardUrl: string;
  previewSecret: string;
  devHostOverrideToken: string | null;
  passwordAttemptLimiter: PasswordAttemptLimiter | null;
  trafficIngestUrl: string | null;
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  waitUntil: (promise: Promise<unknown>) => void;
  now: () => Date;
}
