import { Effect, Schema } from "effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import type * as HttpClientResponse from "effect/http/HttpClientResponse";

import { DNS_RESOLVER_TIMEOUT_MS } from "./constants/domains";
import {
  VERCEL_API_URL,
  VERCEL_DNS_CALLBACK_PATH,
  VERCEL_DNS_HTTP_TIMEOUT_MS,
  VERCEL_DNS_RECORD_COMMENT,
  VERCEL_DNS_RECORD_TTL_SECONDS,
  VERCEL_DNS_STATE_LABEL,
  VERCEL_NAMESERVER_SUFFIX,
} from "./constants/vercel-dns";
import { getDashboardUrl } from "./env";
import { SiteProviderRequestError } from "./schemas/provider-error";
import { VercelTokenResponse } from "./schemas/vercel-dns";
import type { DomainConnectCallbackClaims } from "./types/domain-connect";
import type {
  ApplyVercelDnsRecordsParams,
  VercelDnsConfig,
  VercelDnsDeps,
  VercelDnsGrant,
} from "./types/vercel-dns";
import {
  createDnsResolver,
  normalizeDnsName,
  relativeDnsName,
  zoneCandidates,
} from "./utils/dns";
import {
  signDomainConnectCallback,
  verifyDomainConnectCallback,
} from "./utils/domain-connect-callback";
import { readBodyUpToEffect } from "./utils/read-body";
import { runSitesEffect } from "./utils/run-sites-effect";

function defaultDeps(): VercelDnsDeps {
  const resolver = createDnsResolver();
  return {
    resolveNs: async (name, signal) => {
      signal?.throwIfAborted();
      const abort = () => resolver.cancel();
      signal?.addEventListener("abort", abort, { once: true });
      try {
        return await resolver.resolveNs(name);
      } finally {
        signal?.removeEventListener("abort", abort);
      }
    },
    fetch: globalThis.fetch,
  };
}

export function getVercelDnsConfig(): VercelDnsConfig | null {
  const slug = process.env.SITES_VERCEL_INTEGRATION_SLUG?.trim();
  const clientId = process.env.SITES_VERCEL_CLIENT_ID?.trim();
  const clientSecret = process.env.SITES_VERCEL_CLIENT_SECRET?.trim();
  if (!(slug && clientId && clientSecret)) {
    return null;
  }
  return { slug, clientId, clientSecret };
}

function vercelDnsRedirectUri(): string {
  return `${getDashboardUrl()}${VERCEL_DNS_CALLBACK_PATH}`;
}

export const findVercelZoneEffect = Effect.fn("VercelDns.findZone")(function* (
  hostname: string,
  deps: Pick<VercelDnsDeps, "resolveNs"> = defaultDeps()
) {
  for (const zone of zoneCandidates(hostname)) {
    const nameservers = yield* Effect.tryPromise({
      try: (signal) => deps.resolveNs(zone, signal),
      catch: () =>
        new SiteProviderRequestError({
          provider: "vercel",
          operation: "discover",
          status: null,
          message: "Vercel nameserver lookup failed",
        }),
    }).pipe(
      Effect.timeoutOrElse({
        duration: DNS_RESOLVER_TIMEOUT_MS * 2,
        orElse: () =>
          Effect.fail(
            new SiteProviderRequestError({
              provider: "vercel",
              operation: "discover",
              status: null,
              message: "Vercel nameserver lookup timed out",
            })
          ),
      }),
      Effect.catchTag("SiteProviderRequestError", () => Effect.succeed([]))
    );
    if (nameservers.length === 0) {
      continue;
    }
    return nameservers.some((ns) =>
      normalizeDnsName(ns).endsWith(VERCEL_NAMESERVER_SUFFIX)
    )
      ? zone
      : null;
  }
  return null;
});

export function findVercelZone(
  hostname: string,
  deps: Pick<VercelDnsDeps, "resolveNs"> = defaultDeps()
): Promise<string | null> {
  return runSitesEffect(findVercelZoneEffect(hostname, deps));
}

export function vercelInstallUrl(
  config: VercelDnsConfig,
  claims: Omit<DomainConnectCallbackClaims, "exp">
): string {
  const state = signDomainConnectCallback(
    claims,
    undefined,
    VERCEL_DNS_STATE_LABEL
  );
  return `https://vercel.com/integrations/${encodeURIComponent(config.slug)}/new?state=${encodeURIComponent(state)}`;
}

export function verifyVercelDnsState(
  state: string
): DomainConnectCallbackClaims | null {
  return verifyDomainConnectCallback(state, undefined, VERCEL_DNS_STATE_LABEL);
}

function withTeam(path: string, teamId: string | null): string {
  return teamId
    ? `${VERCEL_API_URL}${path}?teamId=${encodeURIComponent(teamId)}`
    : `${VERCEL_API_URL}${path}`;
}

const vercelRequest = Effect.fn("VercelDns.request")(function* <A>(
  request: HttpClientRequest.HttpClientRequest,
  operation: string,
  deps: Pick<VercelDnsDeps, "fetch">,
  use: (
    response: HttpClientResponse.HttpClientResponse,
    native: Response
  ) => Effect.Effect<A, SiteProviderRequestError>
) {
  let nativeResponse: Response | undefined;
  let status: number | null = null;
  const failure = (message: string) =>
    new SiteProviderRequestError({
      provider: "vercel",
      operation,
      status,
      message,
    });
  const transport: typeof fetch = async (input, init) => {
    const response = await deps.fetch(input, init);
    if (init?.signal?.aborted) {
      void response.body?.cancel().catch(() => undefined);
      return response;
    }
    nativeResponse = response;
    return response;
  };
  const cleanup = Effect.tryPromise({
    try: async () => {
      if (nativeResponse?.body && !nativeResponse.body.locked) {
        await nativeResponse.body.cancel();
      }
    },
    catch: () => failure("Vercel response cleanup failed"),
  }).pipe(
    Effect.timeoutOrElse({
      duration: VERCEL_DNS_HTTP_TIMEOUT_MS,
      orElse: () => Effect.fail(failure("Vercel response cleanup timed out")),
    })
  );
  return yield* Effect.scoped(
    Effect.gen(function* () {
      yield* Effect.addFinalizer(() =>
        cleanup.pipe(
          Effect.catchTag("SiteProviderRequestError", () => Effect.void),
          Effect.interruptible
        )
      );
      const client = yield* HttpClient.HttpClient;
      const response = yield* HttpClient.withScope(client)
        .execute(request)
        .pipe(Effect.mapError(() => failure("Vercel request failed")));
      status = response.status;
      if (!nativeResponse) {
        return yield* Effect.fail(failure("Vercel response unavailable"));
      }
      const result = yield* use(response, nativeResponse);
      yield* cleanup;
      nativeResponse = undefined;
      return result;
    })
  ).pipe(
    Effect.timeoutOrElse({
      duration: VERCEL_DNS_HTTP_TIMEOUT_MS,
      orElse: () => Effect.fail(failure("Vercel request timed out")),
    }),
    Effect.provide(FetchHttpClient.layer),
    Effect.provideService(FetchHttpClient.Fetch, transport)
  );
});

export const exchangeVercelCodeEffect = Effect.fn("VercelDns.exchangeCode")(
  function* (
    config: VercelDnsConfig,
    code: string,
    deps: Pick<VercelDnsDeps, "fetch"> = defaultDeps()
  ) {
    const request = HttpClientRequest.post(
      `${VERCEL_API_URL}/v2/oauth/access_token`
    ).pipe(
      HttpClientRequest.bodyUrlParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: vercelDnsRedirectUri(),
      })
    );
    const body = yield* vercelRequest(
      request,
      "exchange",
      deps,
      (response, native) => {
        const error = new SiteProviderRequestError({
          provider: "vercel",
          operation: "exchange",
          status: response.status,
          message: `Vercel token exchange failed (${response.status})`,
        });
        if (response.status < 200 || response.status >= 300) {
          return Effect.fail(error);
        }
        return readBodyUpToEffect(native, 64 * 1024).pipe(
          Effect.flatMap((body) =>
            body.exceeded
              ? Effect.fail(error)
              : Schema.decodeUnknownEffect(
                  Schema.fromJsonString(VercelTokenResponse)
                )(new TextDecoder().decode(body.bytes)).pipe(
                  Effect.mapError(() => error)
                )
          ),
          Effect.mapError(() => error)
        );
      }
    );
    return {
      accessToken: body.access_token,
      teamId: body.team_id ?? null,
      configurationId: body.installation_id,
    };
  }
);

export function exchangeVercelCode(
  config: VercelDnsConfig,
  code: string,
  deps: Pick<VercelDnsDeps, "fetch"> = defaultDeps()
): Promise<VercelDnsGrant> {
  return runSitesEffect(exchangeVercelCodeEffect(config, code, deps));
}

export const applyVercelDnsRecordsEffect = Effect.fn("VercelDns.applyRecords")(
  function* ({
    grant,
    zone,
    records,
    deps = defaultDeps(),
  }: ApplyVercelDnsRecordsParams) {
    for (const record of records) {
      const request = HttpClientRequest.post(
        withTeam(
          `/v2/domains/${encodeURIComponent(zone)}/records`,
          grant.teamId
        )
      ).pipe(
        HttpClientRequest.bearerToken(grant.accessToken),
        HttpClientRequest.bodyJsonUnsafe({
          name: relativeDnsName(record.name, zone),
          type: record.type,
          value: record.value,
          ttl: VERCEL_DNS_RECORD_TTL_SECONDS,
          comment: VERCEL_DNS_RECORD_COMMENT,
        })
      );
      yield* vercelRequest(request, "apply", deps, (response) =>
        (response.status >= 200 && response.status < 300) ||
        response.status === 409
          ? Effect.void
          : Effect.fail(
              new SiteProviderRequestError({
                provider: "vercel",
                operation: "apply",
                status: response.status,
                message: `Vercel rejected the ${record.type} record for ${record.name} (${response.status})`,
              })
            )
      );
    }
  }
);

export function applyVercelDnsRecords(
  params: ApplyVercelDnsRecordsParams
): Promise<void> {
  return runSitesEffect(applyVercelDnsRecordsEffect(params));
}

export const removeVercelInstallationEffect = Effect.fn(
  "VercelDns.removeInstallation"
)(function* (
  grant: VercelDnsGrant,
  deps: Pick<VercelDnsDeps, "fetch"> = defaultDeps()
) {
  const request = HttpClientRequest.delete(
    withTeam(
      `/v1/integrations/configuration/${encodeURIComponent(grant.configurationId)}`,
      grant.teamId
    )
  ).pipe(HttpClientRequest.bearerToken(grant.accessToken));
  yield* vercelRequest(request, "uninstall", deps, () => Effect.void).pipe(
    Effect.catchTag("SiteProviderRequestError", () => Effect.void)
  );
});

export function removeVercelInstallation(
  grant: VercelDnsGrant,
  deps: Pick<VercelDnsDeps, "fetch"> = defaultDeps()
): Promise<void> {
  return runSitesEffect(removeVercelInstallationEffect(grant, deps));
}
