import {
  createHmac,
  createPrivateKey,
  type KeyObject,
  sign,
  timingSafeEqual,
} from "node:crypto";

import { fetchPublicUrl } from "@notra/ai/utils/public-fetch";

import {
  CALLBACK_TOKEN_LABEL,
  CALLBACK_TOKEN_SECONDS,
  DOMAIN_CONNECT_CALLBACK_PATH,
  DOMAIN_CONNECT_CNAME_TARGET,
  DOMAIN_CONNECT_DISCOVERY_HOST,
  DOMAIN_CONNECT_HTTP_TIMEOUT_MS,
  DOMAIN_CONNECT_MAX_SETTINGS_BYTES,
  DOMAIN_CONNECT_OWNERSHIP_VARIABLE,
  DOMAIN_CONNECT_RESERVED_PARAMS,
  OWNERSHIP_RECORD_PREFIX,
  PUBLIC_KEY_CHUNK_LENGTH,
} from "./constants/domain-connect";
import { getDashboardUrl, getSitesPreviewSecret, siteCnameTarget } from "./env";
import { domainConnectSettingsSchema } from "./schemas/domain-connect";
import type {
  BuildApplyUrlParams,
  DomainConnectCallbackClaims,
  DomainConnectConfig,
  DomainConnectDeps,
  DomainConnectForDomainParams,
  DomainConnectJsonResponse,
  DomainConnectResult,
  DomainConnectSettings,
} from "./types/domain-connect";
import {
  createDnsResolver,
  normalizeDnsName,
  zoneCandidates,
} from "./utils/dns";
import { errorMessage } from "./utils/errors";
import { safeJson } from "./utils/json";
import { readBodyUpTo } from "./utils/read-body";

function defaultDeps(): DomainConnectDeps {
  const resolver = createDnsResolver();
  return {
    resolveTxt: (name) => resolver.resolveTxt(name),
    fetch: (input, init) =>
      fetchPublicUrl(input, init, {
        maxRedirects: 3,
      }),
  };
}

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
      error: errorMessage(error),
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
      if (DOMAIN_CONNECT_DISCOVERY_HOST.test(value)) {
        return value;
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function fetchJson(
  url: string,
  deps: DomainConnectDeps
): Promise<DomainConnectJsonResponse> {
  const response = await deps.fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(DOMAIN_CONNECT_HTTP_TIMEOUT_MS),
  });
  if (!response.ok) {
    await response.body?.cancel();
    return { status: response.status, body: null };
  }
  const { bytes, exceeded } = await readBodyUpTo(
    response,
    DOMAIN_CONNECT_MAX_SETTINGS_BYTES
  );
  const body: unknown = exceeded
    ? null
    : safeJson(new TextDecoder().decode(bytes));
  return { status: response.status, body };
}

export async function discoverDomainConnect(
  hostname: string,
  deps: DomainConnectDeps = defaultDeps()
): Promise<DomainConnectSettings | null> {
  const normalized = normalizeDnsName(hostname);
  for (const zone of zoneCandidates(normalized)) {
    const discoveryHost = await lookupDiscoveryHost(zone, deps);
    if (!discoveryHost) {
      continue;
    }
    try {
      const { body } = await fetchJson(
        `https://${discoveryHost}/v2/${zone}/settings`,
        deps
      );
      const parsed = domainConnectSettingsSchema.safeParse(body);
      if (parsed.success) {
        return {
          ...parsed.data,
          domain: zone,
          host: normalized.slice(0, -(zone.length + 1)),
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function isTemplateSupported(
  settings: Pick<DomainConnectSettings, "urlAPI">,
  template: Pick<DomainConnectConfig, "providerId" | "serviceId">,
  deps: Pick<DomainConnectDeps, "fetch">
): Promise<boolean> {
  const url = `${settings.urlAPI.replace(/\/+$/, "")}/v2/domainTemplates/providers/${encodeURIComponent(template.providerId)}/services/${encodeURIComponent(template.serviceId)}`;
  try {
    const response = await deps.fetch(url, {
      signal: AbortSignal.timeout(DOMAIN_CONNECT_HTTP_TIMEOUT_MS),
    });
    await response.body?.cancel();
    return response.ok;
  } catch {
    return false;
  }
}

export function buildApplyUrl(params: BuildApplyUrlParams): string {
  const { settings, config } = params;
  if (!settings.urlSyncUX) {
    throw new Error("DNS provider does not support the synchronous flow");
  }
  const query: Record<string, string> = {
    domain: params.domain,
    host: params.host,
  };
  for (const [name, value] of Object.entries(params.variables)) {
    if (DOMAIN_CONNECT_RESERVED_PARAMS.has(name)) {
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

function hmac(payload: string, label: string): Buffer {
  return createHmac("sha256", getSitesPreviewSecret())
    .update(`${label}${payload}`)
    .digest();
}

export function signDomainConnectCallback(
  claims: Omit<DomainConnectCallbackClaims, "exp">,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  label: string = CALLBACK_TOKEN_LABEL
): string {
  const payload = Buffer.from(
    JSON.stringify({ ...claims, exp: nowSeconds + CALLBACK_TOKEN_SECONDS })
  ).toString("base64url");
  return `${payload}.${hmac(payload, label).toString("base64url")}`;
}

export function verifyDomainConnectCallback(
  token: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  label: string = CALLBACK_TOKEN_LABEL
): DomainConnectCallbackClaims | null {
  const [payload, signature, extra] = token.split(".");
  if (!(payload && signature) || extra !== undefined) {
    return null;
  }
  const expected = hmac(payload, label);
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

function settingsName(
  settings: DomainConnectSettings | null
): string | undefined {
  return settings?.providerDisplayName ?? settings?.providerName;
}

export async function domainConnectForDomain({
  siteId,
  domain,
  deps = defaultDeps(),
}: DomainConnectForDomainParams): Promise<DomainConnectResult> {
  if (domain.kind !== "subdomain") {
    return { status: "unavailable", reason: "not_subdomain" };
  }
  if (domain.status === "active") {
    return { status: "unavailable", reason: "already_active" };
  }

  const settings = await discoverDomainConnect(domain.hostname, deps);
  const manual: DomainConnectResult = {
    status: "unsupported",
    providerName: settingsName(settings),
    zone: settings?.domain,
  };
  const config = getDomainConnectConfig();
  const ownership = domain.verificationRecords.find(
    (record) =>
      record.purpose === "ownership" &&
      record.type === "TXT" &&
      record.name === `${OWNERSHIP_RECORD_PREFIX}${domain.hostname}`
  );
  if (
    !(config && ownership && settings?.urlSyncUX) ||
    siteCnameTarget() !== DOMAIN_CONNECT_CNAME_TARGET ||
    !(await isTemplateSupported(settings, config, deps))
  ) {
    return manual;
  }
  const token = signDomainConnectCallback({ siteId, domainId: domain.id });
  return {
    status: "ready",
    providerName: settingsName(settings) ?? settings.providerId,
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
