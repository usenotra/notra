/** The subset of R2 the worker uses, so tests can pass an in-memory bucket. */
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
  /** Dev only: lets requests to *.workers.dev pick a site host via `x-notra-host`. */
  DEV_HOST_OVERRIDE_TOKEN?: string;
}

export interface SitesDeps {
  bucket: SiteBucket;
  cache: SiteEdgeCache | null;
  hostingDomain: string;
  dashboardUrl: string;
  previewSecret: string;
  devHostOverrideToken: string | null;
  waitUntil: (promise: Promise<unknown>) => void;
  now: () => Date;
}
