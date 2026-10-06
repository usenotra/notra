import type { KeyObject } from "node:crypto";

import type { SiteDomain } from "./domains";
import type { Site } from "./sites";

export interface DomainConnectConfig {
  providerId: string;
  serviceId: string;
  keyHost: string;
  privateKey: KeyObject;
}

export interface DomainConnectSettings {
  providerId: string;
  providerName: string;
  providerDisplayName?: string;
  urlSyncUX?: string;
  urlAPI: string;
  domain: string;
  host: string;
}

export type DomainConnectResult =
  | { status: "unavailable"; reason: "not_subdomain" | "already_active" }
  | { status: "unsupported"; providerName?: string; zone?: string }
  | { status: "ready"; providerName: string; applyUrl: string };

export interface DomainConnectCallbackClaims {
  siteId: string;
  domainId: string;
  exp: number;
}

export interface DomainConnectDeps {
  resolveTxt: (name: string) => Promise<string[][]>;
  fetch: typeof fetch;
}

export interface DomainConnectJsonResponse {
  status: number;
  body: unknown;
}

export interface BuildApplyUrlParams {
  settings: Pick<DomainConnectSettings, "urlSyncUX">;
  config: DomainConnectConfig;
  domain: string;
  host: string;
  variables: Record<string, string>;
  redirectUri?: string;
  state?: string;
}

export interface DnsSetupForDomainParams {
  site: Pick<Site, "id">;
  domainId: string;
}

export interface DomainConnectForDomainParams {
  siteId: string;
  domain: SiteDomain;
  deps?: DomainConnectDeps;
}
