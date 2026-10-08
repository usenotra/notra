import type {
  SiteManifest,
  SiteManifestFile,
} from "@notra/sites-core/types/deployment";

import type { SitesDeps } from "./worker";

export interface SiteRequestContext {
  deps: SitesDeps;
  request: Request;
  url: URL;
  host: string;
  origin: string;
}

export interface ResolvedDeployment {
  siteId: string;
  deploymentId: string;
  isPreview: boolean;
  trafficToken: string | null;
}

export interface LoadedManifest {
  manifest: SiteManifest;
  files: Map<string, SiteManifestFile>;
}

export interface TimedCacheEntry<T> {
  value: T;
  at: number;
}

export interface ServeFileParams {
  deps: SitesDeps;
  request: Request;
  siteId: string;
  deploymentId: string;
  file: SiteManifestFile;
  status: number;
  isPreview: boolean;
  contentSecurityPolicy?: string;
  analytics?: AnalyticsScriptTag | null;
  extraHeaders?: Record<string, string>;
}

export interface AnalyticsScriptTag {
  scriptSrc: string;
  eventPath: string;
}

export interface RedirectMatch {
  location: string;
  status: number;
}

export interface MarkdownNotFoundParams {
  path: string;
  indexPath: string | null;
  llmsPath: string;
}
