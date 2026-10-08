import { Effect, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";

import {
  CLOUDFLARE_MAX_RESPONSE_BYTES,
  CLOUDFLARE_REQUEST_TIMEOUT_MS,
} from "./constants/cloudflare-saas";
import { CLOUDFLARE_ZONES_API } from "./constants/domains";
import {
  cloudflareApiResponseSchema,
  cloudflareCustomHostnameSchema,
} from "./schemas/cloudflare-saas";
import { SiteProviderRequestError } from "./schemas/provider-error";
import type { CloudflareSaasConfig } from "./types/cloudflare-saas";
import { readBodyUpToEffect } from "./utils/read-body";
import { runSitesEffect } from "./utils/run-sites-effect";

export function cloudflareSaasConfig(): CloudflareSaasConfig | null {
  const zoneId = process.env.CLOUDFLARE_SAAS_ZONE_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_SAAS_API_TOKEN?.trim();
  return zoneId && apiToken ? { zoneId, apiToken } : null;
}

const requestEffect = Effect.fn("Sites.Cloudflare.request")(
  function* (
    config: CloudflareSaasConfig,
    operation: string,
    path: string,
    method: "GET" | "POST" | "DELETE",
    body?: string
  ) {
    const transport = yield* FetchHttpClient.Fetch;
    const client = HttpClient.withScope(yield* HttpClient.HttpClient);
    let fetched: Response | undefined;
    let status: number | null = null;
    const failure = (message: string) =>
      new SiteProviderRequestError({
        provider: "cloudflare",
        operation,
        status,
        message,
      });
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        void fetched?.body?.cancel().catch(() => undefined);
      })
    );
    let request = HttpClientRequest.make(method)(
      `${CLOUDFLARE_ZONES_API}/${encodeURIComponent(config.zoneId)}${path}`
    ).pipe(
      HttpClientRequest.setHeaders({
        Authorization: `Bearer ${config.apiToken}`,
        "Content-Type": "application/json",
      })
    );
    if (body !== undefined) {
      request = HttpClientRequest.bodyText(request, body, "application/json");
    }
    const response = yield* client.execute(request).pipe(
      Effect.provideService(FetchHttpClient.Fetch, async (input, init) => {
        const result = await transport(input, init);
        fetched = result;
        if (init?.signal?.aborted) {
          void result.body?.cancel().catch(() => undefined);
        }
        return result;
      }),
      Effect.mapError(() => failure("Cloudflare request failed"))
    );
    status = response.status;
    if (response.status < 200 || response.status >= 300) {
      return yield* Effect.fail(
        failure(`Cloudflare rejected the request (${response.status})`)
      );
    }
    if (!fetched) {
      return yield* Effect.fail(failure("Cloudflare response is unavailable"));
    }
    const capped = yield* readBodyUpToEffect(
      fetched,
      CLOUDFLARE_MAX_RESPONSE_BYTES
    ).pipe(
      Effect.mapError(() => failure("Cloudflare response could not be read"))
    );
    if (capped.exceeded) {
      return yield* Effect.fail(
        failure("Cloudflare response exceeds its size limit")
      );
    }
    const envelope = yield* Schema.decodeUnknownEffect(
      Schema.fromJsonString(cloudflareApiResponseSchema)
    )(new TextDecoder().decode(capped.bytes)).pipe(
      Effect.mapError(() => failure("Cloudflare returned an invalid response"))
    );
    if (!envelope.success) {
      return yield* Effect.fail(failure("Cloudflare rejected the request"));
    }
    return envelope.result;
  },
  (program, _config, operation) =>
    program.pipe(
      Effect.scoped,
      Effect.timeoutOrElse({
        duration: CLOUDFLARE_REQUEST_TIMEOUT_MS,
        orElse: () =>
          Effect.fail(
            new SiteProviderRequestError({
              provider: "cloudflare",
              operation,
              status: null,
              message: "Cloudflare request timed out",
            })
          ),
      }),
      Effect.provide(FetchHttpClient.layer)
    )
);

export const createCustomHostnameEffect = Effect.fn(
  "Sites.Cloudflare.createHostname"
)(function* (config: CloudflareSaasConfig, hostname: string) {
  const result = yield* requestEffect(
    config,
    "createHostname",
    "/custom_hostnames",
    "POST",
    JSON.stringify({
      hostname,
      ssl: { method: "http", type: "dv", settings: { min_tls_version: "1.2" } },
    })
  );
  return yield* Schema.decodeUnknownEffect(cloudflareCustomHostnameSchema)(
    result
  ).pipe(
    Effect.mapError(
      () =>
        new SiteProviderRequestError({
          provider: "cloudflare",
          operation: "createHostname",
          status: null,
          message: "Cloudflare returned an invalid custom hostname",
        })
    )
  );
});

export const getCustomHostnameEffect = Effect.fn(
  "Sites.Cloudflare.getHostname"
)(function* (config: CloudflareSaasConfig, id: string) {
  const result = yield* requestEffect(
    config,
    "getHostname",
    `/custom_hostnames/${encodeURIComponent(id)}`,
    "GET"
  );
  return yield* Schema.decodeUnknownEffect(cloudflareCustomHostnameSchema)(
    result
  ).pipe(
    Effect.mapError(
      () =>
        new SiteProviderRequestError({
          provider: "cloudflare",
          operation: "getHostname",
          status: null,
          message: "Cloudflare returned an invalid custom hostname",
        })
    )
  );
});

export const findCustomHostnameEffect = Effect.fn(
  "Sites.Cloudflare.findHostname"
)(function* (config: CloudflareSaasConfig, hostname: string) {
  const result = yield* requestEffect(
    config,
    "findHostname",
    `/custom_hostnames?hostname=${encodeURIComponent(hostname)}`,
    "GET"
  );
  const entries = yield* Schema.decodeUnknownEffect(
    Schema.Array(cloudflareCustomHostnameSchema)
  )(result).pipe(
    Effect.mapError(
      () =>
        new SiteProviderRequestError({
          provider: "cloudflare",
          operation: "findHostname",
          status: null,
          message: "Cloudflare returned an invalid hostname list",
        })
    )
  );
  return entries.find((entry) => entry.hostname === hostname) ?? null;
});

export const deleteCustomHostnameEffect = Effect.fn(
  "Sites.Cloudflare.deleteHostname"
)((config: CloudflareSaasConfig, id: string) =>
  requestEffect(
    config,
    "deleteHostname",
    `/custom_hostnames/${encodeURIComponent(id)}`,
    "DELETE"
  ).pipe(Effect.asVoid)
);

export function createCustomHostname(
  config: CloudflareSaasConfig,
  hostname: string
) {
  return runSitesEffect(createCustomHostnameEffect(config, hostname));
}

export function getCustomHostname(config: CloudflareSaasConfig, id: string) {
  return runSitesEffect(getCustomHostnameEffect(config, id));
}

export function findCustomHostname(
  config: CloudflareSaasConfig,
  hostname: string
) {
  return runSitesEffect(findCustomHostnameEffect(config, hostname));
}

export function deleteCustomHostname(
  config: CloudflareSaasConfig,
  id: string
): Promise<void> {
  return runSitesEffect(deleteCustomHostnameEffect(config, id));
}

export function deleteCustomHostnameQuietly(id: string | null): Promise<void> {
  const config = cloudflareSaasConfig();
  if (!(config && id)) {
    return Promise.resolve();
  }
  return runSitesEffect(
    deleteCustomHostnameEffect(config, id).pipe(
      Effect.catchTag("SiteProviderRequestError", (error) =>
        Effect.sync(() => {
          console.warn("sites.custom_hostname_delete_failed", {
            id,
            error: error.message,
          });
        })
      )
    )
  );
}
