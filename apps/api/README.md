To install dependencies:
```sh
bun install
```

To run:
```sh
bun run dev
```

open the local URL Bun prints on startup

The dev server runs with Bun so the `fetch` export is actually served.

## Request caching

The OpenAPI document is generated and serialized once per process, on its first
request. Restart the process to pick up schema changes.

GEO plan checks use an in-process Effect cache with at most 2,048 organizations
per Autumn credential. Only positive entitlement checks are cached, for 30 seconds;
concurrent lookups for the same organization share one request. A plan revocation
can take up to 30 seconds to reach the API. Upgrades, denied checks, and provider
failures are not cached. An unexpired positive check remains usable during an
Autumn outage; after expiry, requests fail closed with 503 if Autumn is unavailable.
Changing the Autumn credential discards the previous cache.

This cache does not cover credit consumption or subscription checks. Unkey key
verification still runs on every authenticated request; legacy permission scopes
are combined into one OR expression instead of separate verification calls.
