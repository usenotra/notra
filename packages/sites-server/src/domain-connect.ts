import { createPrivateKey, type KeyObject, sign } from "node:crypto";

import { fetchPublicUrl } from "@notra/ai/utils/public-fetch";
import { Effect } from "effect";

import {
  DOMAIN_CONNECT_CALLBACK_PATH,
  DOMAIN_CONNECT_CNAME_TARGET,
  DOMAIN_CONNECT_DISCOVERY_HOST,
  DOMAIN_CONNECT_HTTP_TIMEOUT_MS,
  DOMAIN_CONNECT_MAX_SETTINGS_BYTES,
  DOMAIN_CONNECT_NOTRA_OWNERSHIP_VARIABLE,
  DOMAIN_CONNECT_OWNERSHIP_VARIABLE,
  DOMAIN_CONNECT_RESERVED_PARAMS,
  OWNERSHIP_RECORD_PREFIX,
} from "./constants/domain-connect";
import {
  DOMAIN_OWNERSHIP_RECORD_PREFIX,
  DNS_RESOLVER_TIMEOUT_MS,
} from "./constants/domains";
import { getDashboardUrl, siteCnameTarget } from "./env";
import {
  domainConnectSettingsSchema,
  domainConnectTemplateSchema,
} from "./schemas/domain-connect";
import { SiteProviderRequestError } from "./schemas/provider-error";
import type {
  BuildApplyUrlParams,
  DomainConnectConfig,
  DomainConnectDeps,
  DomainConnectForDomainParams,
  DomainConnectJsonResponse,
  DomainConnectOwnershipVariables,
  DomainConnectResult,
  DomainConnectSettings,
} from "./types/domain-connect";
import {
  createDnsResolver,
  normalizeDnsName,
  zoneCandidates,
} from "./utils/dns";
import { signDomainConnectCallback } from "./utils/domain-connect-callback";
import { errorMessage } from "./utils/errors";
import { safeJson } from "./utils/json";
import { readBodyUpToEffect } from "./utils/read-body";
import { runSitesEffect } from "./utils/run-sites-effect";

function defaultDeps(): DomainConnectDeps {
  const resolver = createDnsResolver();
  return {
    resolveTxt: async (name, signal) => {
      if (signal?.aborted) {
        throw signal.reason;
      }
      const cancel = () => resolver.cancel();
      signal?.addEventListener("abort", cancel, { once: true });
      try {
        return await resolver.resolveTxt(name);
      } finally {
        signal?.removeEventListener("abort", cancel);
      }
    },
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

const lookupDiscoveryHostEffect = Effect.fn(
  "Sites.DomainConnect.lookupDiscovery"
)(
  function* (zone: string, deps: DomainConnectDeps) {
    const records = yield* Effect.tryPromise({
      try: (signal) => deps.resolveTxt(`_domainconnect.${zone}`, signal),
      catch: () =>
        new SiteProviderRequestError({
          provider: "domain_connect",
          operation: "lookupDiscovery",
          status: null,
          message: "Domain Connect DNS lookup failed",
        }),
    });
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
    return null;
  },
  (program) =>
    program.pipe(
      Effect.timeoutOrElse({
        duration: DNS_RESOLVER_TIMEOUT_MS * 2,
        orElse: () =>
          Effect.fail(
            new SiteProviderRequestError({
              provider: "domain_connect",
              operation: "lookupDiscovery",
              status: null,
              message: "Domain Connect DNS lookup timed out",
            })
          ),
      }),
      Effect.catchTag("SiteProviderRequestError", () => Effect.succeed(null))
    )
);

const fetchJsonEffect = Effect.fn("Sites.DomainConnect.fetchJson")(
  function* (url: string, deps: Pick<DomainConnectDeps, "fetch">) {
    const controller = yield* Effect.acquireRelease(
      Effect.sync(() => new AbortController()),
      (owned) => Effect.sync(() => owned.abort())
    );
    const response = yield* Effect.tryPromise({
      try: async (signal) => {
        const result = await deps.fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.any([controller.signal, signal]),
        });
        if (signal.aborted) {
          void result.body?.cancel().catch(() => undefined);
        }
        return result;
      },
      catch: () =>
        new SiteProviderRequestError({
          provider: "domain_connect",
          operation: "fetchJson",
          status: null,
          message: "Domain Connect request failed",
        }),
    });
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        void response.body?.cancel().catch(() => undefined);
      })
    );
    if (!response.ok) {
      return {
        status: response.status,
        body: null,
      } satisfies DomainConnectJsonResponse;
    }
    const { bytes, exceeded } = yield* readBodyUpToEffect(
      response,
      DOMAIN_CONNECT_MAX_SETTINGS_BYTES
    ).pipe(
      Effect.mapError(
        () =>
          new SiteProviderRequestError({
            provider: "domain_connect",
            operation: "fetchJson",
            status: response.status,
            message: "Domain Connect response could not be read",
          })
      )
    );
    const body: unknown = exceeded
      ? null
      : safeJson(new TextDecoder().decode(bytes));
    return {
      status: response.status,
      body,
    } satisfies DomainConnectJsonResponse;
  },
  (program) =>
    program.pipe(
      Effect.scoped,
      Effect.timeoutOrElse({
        duration: DOMAIN_CONNECT_HTTP_TIMEOUT_MS,
        orElse: () =>
          Effect.fail(
            new SiteProviderRequestError({
              provider: "domain_connect",
              operation: "fetchJson",
              status: null,
              message: "Domain Connect request timed out",
            })
          ),
      })
    )
);

export const discoverDomainConnectEffect = Effect.fn(
  "Sites.DomainConnect.discover"
)(function* (hostname: string, providedDeps?: DomainConnectDeps) {
  const deps = providedDeps ?? defaultDeps();
  const normalized = normalizeDnsName(hostname);
  for (const zone of zoneCandidates(normalized)) {
    const discoveryHost = yield* lookupDiscoveryHostEffect(zone, deps);
    if (!discoveryHost) {
      continue;
    }
    const result = yield* fetchJsonEffect(
      `https://${discoveryHost}/v2/${zone}/settings`,
      deps
    ).pipe(
      Effect.catchTag("SiteProviderRequestError", () => Effect.succeed(null))
    );
    if (!result) {
      continue;
    }
    const { body } = result;
    const parsed = domainConnectSettingsSchema.safeParse(body);
    if (parsed.success) {
      return {
        ...parsed.data,
        domain: zone,
        host: normalized.slice(0, -(zone.length + 1)),
      };
    }
  }
  return null;
});

export function discoverDomainConnect(
  hostname: string,
  deps?: DomainConnectDeps
): Promise<DomainConnectSettings | null> {
  return runSitesEffect(discoverDomainConnectEffect(hostname, deps));
}

const isTemplateSupportedEffect = Effect.fn(
  "Sites.DomainConnect.supportsTemplate"
)(function* (
  settings: Pick<DomainConnectSettings, "urlAPI">,
  template: Pick<DomainConnectConfig, "providerId" | "serviceId">,
  deps: Pick<DomainConnectDeps, "fetch">
) {
  const url = `${settings.urlAPI.replace(/\/+$/, "")}/v2/domainTemplates/providers/${encodeURIComponent(template.providerId)}/services/${encodeURIComponent(template.serviceId)}`;
  const result = yield* fetchJsonEffect(url, deps).pipe(
    Effect.catchTag("SiteProviderRequestError", () => Effect.succeed(null))
  );
  if (!result) {
    return false;
  }
  const { body } = result;
  const parsed = domainConnectTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return false;
  }
  return (
    parsed.data.records.some(
      (record) =>
        record.type === "CNAME" &&
        record.host === "@" &&
        record.pointsTo === DOMAIN_CONNECT_CNAME_TARGET
    ) &&
    parsed.data.records.some(
      (record) =>
        record.type === "TXT" &&
        record.host === "_cf-custom-hostname" &&
        record.data === `%${DOMAIN_CONNECT_OWNERSHIP_VARIABLE}%`
    ) &&
    parsed.data.records.some(
      (record) =>
        record.type === "TXT" &&
        record.host === "_notra" &&
        record.data === `%${DOMAIN_CONNECT_NOTRA_OWNERSHIP_VARIABLE}%`
    )
  );
});

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

function settingsName(
  settings: DomainConnectSettings | null
): string | undefined {
  return settings?.providerDisplayName ?? settings?.providerName;
}

export const domainConnectForDomainEffect = Effect.fn(
  "Sites.DomainConnect.forDomain"
)(function* ({ siteId, domain, deps }: DomainConnectForDomainParams) {
  if (domain.kind !== "subdomain") {
    return {
      status: "unavailable",
      reason: "not_subdomain",
    } satisfies DomainConnectResult;
  }
  if (domain.status === "active") {
    return {
      status: "unavailable",
      reason: "already_active",
    } satisfies DomainConnectResult;
  }

  const dependencies = deps ?? defaultDeps();
  const settings = yield* discoverDomainConnectEffect(
    domain.hostname,
    dependencies
  );
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
  const notraOwnership = domain.verificationRecords.find(
    (record) =>
      record.purpose === "ownership" &&
      record.type === "TXT" &&
      record.name === `${DOMAIN_OWNERSHIP_RECORD_PREFIX}${domain.hostname}`
  );
  if (
    !(config && ownership && notraOwnership && settings?.urlSyncUX) ||
    siteCnameTarget() !== DOMAIN_CONNECT_CNAME_TARGET
  ) {
    return manual;
  }
  if (!(yield* isTemplateSupportedEffect(settings, config, dependencies))) {
    return manual;
  }
  const token = signDomainConnectCallback({ siteId, domainId: domain.id });
  const variables: DomainConnectOwnershipVariables = {
    [DOMAIN_CONNECT_OWNERSHIP_VARIABLE]: ownership.value,
    [DOMAIN_CONNECT_NOTRA_OWNERSHIP_VARIABLE]: notraOwnership.value,
  };
  return {
    status: "ready",
    providerName: settingsName(settings) ?? settings.providerId,
    applyUrl: buildApplyUrl({
      settings,
      config,
      domain: settings.domain,
      host: settings.host,
      variables,
      redirectUri: `${getDashboardUrl()}${DOMAIN_CONNECT_CALLBACK_PATH}/${token}`,
    }),
  } satisfies DomainConnectResult;
});

export function domainConnectForDomain(
  params: DomainConnectForDomainParams
): Promise<DomainConnectResult> {
  return runSitesEffect(domainConnectForDomainEffect(params));
}
