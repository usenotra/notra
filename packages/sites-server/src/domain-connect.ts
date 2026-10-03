import {
  createHmac,
  createPrivateKey,
  type KeyObject,
  sign,
  timingSafeEqual,
} from "node:crypto";
import { Resolver } from "node:dns/promises";

import { db } from "@notra/db/drizzle";
import { siteDomains } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";
import z from "zod";

import type { Site } from "./deployments";
import { siteCnameTarget } from "./domains";
import { getDashboardUrl, getSitesPreviewSecret } from "./env";
import { SiteInputError } from "./sites";

/**
 * Domain Connect (synchronous flow, signed requests): the customer's DNS provider
 * applies our template `domain-connect/usenotra.com.sites.json` after they log in there.
 * Spec: https://github.com/Domain-Connect/spec/blob/master/Domain%20Connect%20Spec%20Draft.adoc
 */

/** Fixed in the published template; Domain Connect is only offered when this environment uses it. */
export const DOMAIN_CONNECT_CNAME_TARGET = "cname.notra.site";
/** Name of the template variable carrying the Cloudflare for SaaS ownership token. */
export const DOMAIN_CONNECT_OWNERSHIP_VARIABLE = "ownership";
/** Dashboard route the DNS provider redirects back to: `{path}/{token}`. */
export const DOMAIN_CONNECT_CALLBACK_PATH = "/sites/domain-connect";

const OWNERSHIP_RECORD_PREFIX = "_cf-custom-hostname.";
const HTTP_TIMEOUT_MS = 5000;
const DNS_TIMEOUT_MS = 3000;
const CALLBACK_TOKEN_SECONDS = 2 * 60 * 60;
const CALLBACK_TOKEN_LABEL = "domain-connect.";
const PUBLIC_KEY_CHUNK_LENGTH = 200;
/** Query parameters with protocol meaning; template variables must not use these names. */
const RESERVED_PARAMS = new Set([
  "domain",
  "host",
  "redirect_uri",
  "state",
  "key",
  "sig",
  "providerName",
  "serviceName",
  "groupId",
]);
const DISCOVERY_HOST = /^[a-z0-9.-]+(?::\d+)?(?:\/[\w.~%/-]*)?$/i;

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
  /** Zone the provider hosts (`acme.com`). */
  domain: string;
  /** Label(s) below the zone (`blog`); never empty, a CNAME cannot sit at the apex. */
  host: string;
}

export type DomainConnectResult =
  | {
      status: "unavailable";
      reason:
        | "not_configured"
        | "not_subdomain"
        | "already_active"
        | "missing_records"
        | "target_mismatch";
    }
  | { status: "unsupported"; providerName?: string }
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

const settingsSchema = z.object({
  providerId: z.string().min(1),
  providerName: z.string().min(1),
  providerDisplayName: z.string().min(1).optional(),
  urlSyncUX: z.url({ protocol: /^https$/ }).optional(),
  urlAPI: z.url({ protocol: /^https$/ }),
});

function defaultDeps(): DomainConnectDeps {
  const resolver = new Resolver({ timeout: DNS_TIMEOUT_MS, tries: 2 });
  return {
    resolveTxt: (name) => resolver.resolveTxt(name),
    fetch: globalThis.fetch,
  };
}

/** Literal `\n` is accepted so the PEM fits single-line env editors. */
export function getDomainConnectConfig(): DomainConnectConfig | null {
  const pem = process.env.SITES_DOMAIN_CONNECT_PRIVATE_KEY?.trim();
  if (!pem) {
    return null;
  }
  let privateKey: KeyObject;
  try {
    privateKey = createPrivateKey(pem.replaceAll("\\n", "\n"));
  } catch (error) {
    console.warn("sites.domain_connect_invalid_key", {
      error: error instanceof Error ? error.message : error,
    });
    return null;
  }
  return {
    providerId:
      process.env.SITES_DOMAIN_CONNECT_PROVIDER_ID?.trim() || "usenotra.com",
    serviceId: process.env.SITES_DOMAIN_CONNECT_SERVICE_ID?.trim() || "sites",
    keyHost: process.env.SITES_DOMAIN_CONNECT_KEY_HOST?.trim() || "_dck1",
    privateKey,
  };
}

/**
 * Parent zones to try, closest first: `docs.blog.acme.co.uk` → `blog.acme.co.uk`,
 * `acme.co.uk`, `co.uk`. The hostname itself is skipped (its CNAME cannot be a zone apex).
 */
export function zoneCandidates(hostname: string): string[] {
  const labels = hostname.toLowerCase().replace(/\.$/, "").split(".");
  const candidates: string[] = [];
  for (let start = 1; labels.length - start >= 2; start += 1) {
    candidates.push(labels.slice(start).join("."));
  }
  return candidates;
}

async function lookupDiscoveryHost(
  zone: string,
  deps: DomainConnectDeps
): Promise<string | null> {
  try {
    const records = await deps.resolveTxt(`_domainconnect.${zone}`);
    for (const chunks of records) {
      const value = chunks
        .join("")
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/\/+$/, "");
      if (DISCOVERY_HOST.test(value)) {
        return value;
      }
    }
  } catch {
    // ENOTFOUND / ENODATA / timeouts: no Domain Connect at this level.
  }
  return null;
}

async function fetchJson(
  url: string,
  deps: DomainConnectDeps
): Promise<{ status: number; body: unknown }> {
  const response = await deps.fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
  });
  const body: unknown = response.ok
    ? await response.json().catch(() => null)
    : null;
  return { status: response.status, body };
}

/**
 * Finds the customer's DNS provider. Returns null when nothing along the way
 * supports Domain Connect; never throws for that case.
 */
export async function discoverDomainConnect(
  hostname: string,
  deps: DomainConnectDeps = defaultDeps()
): Promise<DomainConnectSettings | null> {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  for (const zone of zoneCandidates(normalized)) {
    const discoveryHost = await lookupDiscoveryHost(zone, deps);
    if (!discoveryHost) {
      continue;
    }
    try {
      // A `_domainconnect` record can exist without the provider hosting this zone (404).
      const { body } = await fetchJson(
        `https://${discoveryHost}/v2/${zone}/settings`,
        deps
      );
      const parsed = settingsSchema.safeParse(body);
      if (parsed.success) {
        return {
          ...parsed.data,
          domain: zone,
          host: normalized.slice(0, -(zone.length + 1)),
        };
      }
    } catch {
      // Unreachable settings endpoint: try the next zone up.
    }
  }
  return null;
}

/** GET `{urlAPI}/v2/domainTemplates/providers/{providerId}/services/{serviceId}`: 2xx = onboarded. */
export async function isTemplateSupported(
  settings: Pick<DomainConnectSettings, "urlAPI">,
  template: Pick<DomainConnectConfig, "providerId" | "serviceId">,
  deps: Pick<DomainConnectDeps, "fetch"> = { fetch: globalThis.fetch }
): Promise<boolean> {
  const url = `${settings.urlAPI.replace(/\/+$/, "")}/v2/domainTemplates/providers/${encodeURIComponent(template.providerId)}/services/${encodeURIComponent(template.serviceId)}`;
  try {
    const response = await deps.fetch(url, {
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Signed apply URL. The signature (RSA-SHA256, base64) covers exactly the query
 * string before `&key=`; `sig` is last because Cloudflare requires it.
 */
export function buildApplyUrl(params: {
  settings: Pick<DomainConnectSettings, "urlSyncUX">;
  config: DomainConnectConfig;
  domain: string;
  host: string;
  variables: Record<string, string>;
  redirectUri?: string;
  state?: string;
}): string {
  const { settings, config } = params;
  if (!settings.urlSyncUX) {
    throw new Error("DNS provider does not support the synchronous flow");
  }
  const query: Record<string, string> = {
    domain: params.domain,
    host: params.host,
  };
  for (const [name, value] of Object.entries(params.variables)) {
    if (RESERVED_PARAMS.has(name)) {
      throw new Error(`Template variable "${name}" collides with a parameter`);
    }
    query[name] = value;
  }
  if (params.redirectUri) {
    query.redirect_uri = params.redirectUri;
  }
  if (params.state) {
    query.state = params.state;
  }
  const signed = Object.keys(query)
    .sort()
    .map(
      (name) =>
        `${encodeURIComponent(name)}=${encodeURIComponent(query[name] ?? "")}`
    )
    .join("&");
  const signature = sign(
    "sha256",
    Buffer.from(signed),
    config.privateKey
  ).toString("base64");
  const base = `${settings.urlSyncUX.replace(/\/+$/, "")}/v2/domainTemplates/providers/${encodeURIComponent(config.providerId)}/services/${encodeURIComponent(config.serviceId)}/apply`;
  return `${base}?${signed}&key=${encodeURIComponent(config.keyHost)}&sig=${encodeURIComponent(signature)}`;
}

/**
 * TXT records for `{keyHost}.{syncPubKeyDomain}`: the SPKI public key in base64,
 * split as `p={n},a=RS256,d={chunk}` so every record stays far below 255 bytes.
 */
export function publicKeyTxtRecords(publicKey: KeyObject): string[] {
  const der = publicKey
    .export({ type: "spki", format: "der" })
    .toString("base64");
  const records: string[] = [];
  for (let offset = 0; offset < der.length; offset += PUBLIC_KEY_CHUNK_LENGTH) {
    records.push(
      `p=${records.length + 1},a=RS256,d=${der.slice(offset, offset + PUBLIC_KEY_CHUNK_LENGTH)}`
    );
  }
  return records;
}

function hmac(payload: string): Buffer {
  return createHmac("sha256", getSitesPreviewSecret())
    .update(`${CALLBACK_TOKEN_LABEL}${payload}`)
    .digest();
}

/**
 * Callback token in the redirect path, not in `state`: Cloudflare ignores `state`.
 * HMAC with the preview secret under its own label, so preview tokens never verify here.
 */
export function signDomainConnectCallback(
  claims: Omit<DomainConnectCallbackClaims, "exp">,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): string {
  const payload = Buffer.from(
    JSON.stringify({ ...claims, exp: nowSeconds + CALLBACK_TOKEN_SECONDS })
  ).toString("base64url");
  return `${payload}.${hmac(payload).toString("base64url")}`;
}

export function verifyDomainConnectCallback(
  token: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): DomainConnectCallbackClaims | null {
  const [payload, signature, extra] = token.split(".");
  if (!(payload && signature) || extra !== undefined) {
    return null;
  }
  const expected = hmac(payload);
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }
  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as Partial<DomainConnectCallbackClaims>;
    if (
      typeof claims.siteId !== "string" ||
      typeof claims.domainId !== "string" ||
      typeof claims.exp !== "number" ||
      claims.exp <= nowSeconds
    ) {
      return null;
    }
    return {
      siteId: claims.siteId,
      domainId: claims.domainId,
      exp: claims.exp,
    };
  } catch {
    return null;
  }
}

/**
 * One-click DNS for an unverified custom subdomain: the same CNAME + ownership TXT
 * the Domains tab lists, applied by the customer's DNS provider when it supports
 * Domain Connect and has onboarded our template.
 */
export async function domainConnectForDomain(params: {
  site: Pick<Site, "id">;
  domainId: string;
  deps?: DomainConnectDeps;
}): Promise<DomainConnectResult> {
  const config = getDomainConnectConfig();
  if (!config) {
    return { status: "unavailable", reason: "not_configured" };
  }
  const [domain] = await db
    .select()
    .from(siteDomains)
    .where(
      and(
        eq(siteDomains.id, params.domainId),
        eq(siteDomains.siteId, params.site.id)
      )
    )
    .limit(1);
  if (!domain) {
    throw new SiteInputError("Domain not found");
  }
  if (domain.kind !== "subdomain") {
    return { status: "unavailable", reason: "not_subdomain" };
  }
  if (domain.status === "active") {
    return { status: "unavailable", reason: "already_active" };
  }
  if (siteCnameTarget() !== DOMAIN_CONNECT_CNAME_TARGET) {
    return { status: "unavailable", reason: "target_mismatch" };
  }
  const ownership = domain.verificationRecords.find(
    (record) =>
      record.purpose === "ownership" &&
      record.type === "TXT" &&
      record.name === `${OWNERSHIP_RECORD_PREFIX}${domain.hostname}`
  );
  if (!ownership) {
    return { status: "unavailable", reason: "missing_records" };
  }

  const deps = params.deps ?? defaultDeps();
  const settings = await discoverDomainConnect(domain.hostname, deps);
  if (!settings?.urlSyncUX) {
    return { status: "unsupported", providerName: settingsName(settings) };
  }
  const providerName = settingsName(settings) ?? settings.providerId;
  if (!(await isTemplateSupported(settings, config, deps))) {
    return { status: "unsupported", providerName };
  }
  const token = signDomainConnectCallback({
    siteId: params.site.id,
    domainId: domain.id,
  });
  return {
    status: "ready",
    providerName,
    applyUrl: buildApplyUrl({
      settings,
      config,
      domain: settings.domain,
      host: settings.host,
      variables: { [DOMAIN_CONNECT_OWNERSHIP_VARIABLE]: ownership.value },
      redirectUri: `${getDashboardUrl()}${DOMAIN_CONNECT_CALLBACK_PATH}/${token}`,
    }),
  };
}

function settingsName(
  settings: DomainConnectSettings | null
): string | undefined {
  return settings?.providerDisplayName ?? settings?.providerName;
}
