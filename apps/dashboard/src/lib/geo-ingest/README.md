# GEO ingest and journey attribution

How AI traffic flows from a customer's site into the journeys you see on the GEO dashboard.

## The pipeline

```
customer middleware (@usenotra/geo)          notra dashboard app
  every GET page request                       POST /api/geo/ingest
  -> request envelope ------------------------> token auth (orgId.hmac bearer)
     url, ip, geo headers, referer,            allowlist host (brand + extras)
     user agent, accept-language               classify visitor
     (no body, no cookies)                     resolve journey id
                                               -> Tinybird geo_traffic_events
```

The ingest route is a thin adapter: every step (auth, rate limit, payload validation, event build, Tinybird write) is an Effect composed into one program in `pipeline.ts` (`runGeoIngest`), and each way it can fail is a tagged error in `errors.ts` (`GeoIngestMissingToken`, `GeoIngestInvalidToken`, `GeoIngestRateLimited`, `GeoIngestInvalidPayload`, `GeoIngestUnparseableUrl`, `GeoIngestFailed`). The route runs the program with `Effect.result` and maps the failure channel to a status in `response.ts`, so no HTTP concern leaks into the Effect itself.

A valid token is not enough to write an event. After the URL parses, ingest loads the project's brand website plus `geo_settings.domains` and drops the request (same silent 202 as an untracked visitor) when the host is not on that list. Org-scoped tokens union every project in the organization. An empty allowlist drops everything. A lookup outage fails open so a database blip does not discard real traffic. Saving GEO settings clears the cached allowlist immediately. The token stays an HMAC of org/project/generation — binding hosts in the signature would rotate on every settings edit.

The SDK is deliberately dumb: it forwards a neutral envelope and never classifies anything. All intelligence lives here, so signature updates ship instantly without customers bumping a package.

## Classification (`classify-visitor.ts`)

Per event, in order:

1. User agent matches an AI signature (`@usenotra/geo/classify`) -> `crawler`, with the signature's agent, category (`training-crawler` | `search-index` | `assistant-browse`), and confidence.
2. Referer host matches an AI assistant domain (chatgpt.com, perplexity.ai, claude.ai, ...) -> `ai_referral`, source = that assistant. This is a human who clicked out of an AI answer.
3. Otherwise -> `human` (normal browser) or `unknown`.

## Journey ids (`journey.ts`)

A journey id groups requests belonging to one agent session. Two kinds, distinguishable by prefix:

### `n_<id>` — explicit tag (precise)

Customers serving Markdown to agents rewrite internal links with `?ntr=<id>` (`tagMarkdownLinks` in `@usenotra/geo/markdown`). An agent arriving without a tag gets a fresh random id minted into the links it is served; every link it follows carries that id back to us. Properties:

- Exact per-operator journeys: five parallel Claude Code instances get five ids, even behind one NAT or a shared provider pool.
- Survives citation: when an assistant later cites a tagged URL to a human, the click carries the id, linking the human visit to the crawl that caused it. This is also the planned conversion-attribution hook.
- Content-derived, random, zero personal data. The `ntr` param is stripped before storage; stored paths are always clean.

### `f_<hash>` — fingerprint (fuzzy fallback)

For untagged traffic, computed ONLY for `crawler`-classified events (humans are never fingerprinted):

```
HMAC-SHA256(secret + "|" + utcDay, source + "|" + ipKey + "|" + timeBucket)[:16]
```

- Keyed with the ingest secret plus a daily-rotating date component: irreversible without the secret, unlinkable across days. Raw IPs are never stored anywhere.
- Category-tuned granularity (`toTuning`):
  - `assistant-browse` (ChatGPT-User etc.): full IP + 10-minute bucket. These are short one-user browse sessions from provider pools; a tight window keeps different users' sessions apart.
  - everything else (GPTBot-style crawls): IP /24 (v4) or first 4 groups (v6) + 30-minute bucket. Crawls hop IPs within a range; coarse keys keep one sweep together.
- Known limits: same-window collisions behind one egress IP, and no linkage across buckets. That is the honest ceiling without provider cooperation; the `n_` layer exists to beat it.

## Privacy posture (why legal is fine with this)

Server-side observation only (no device access, so no consent banner under ePrivacy), legitimate-interest basis, raw IP transient, fingerprints salted + rotating + crawler-only, identifiers expire in minutes. See `~/Documents/notra-dpa-briefing.md` for the DPA context.

## Where data lands

`geo_traffic_events` (Tinybird): org, timestamp, visitor_type, source, agent, category, confidence, path, host, method, referer, ua, country, language, request id, journey_id. Queried by the `geo_traffic_*` pipes (overview, timeseries, pages, log, journeys) through the Redis-cached client in `@notra/analytics`.
