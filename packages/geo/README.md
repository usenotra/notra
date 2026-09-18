# @usenotra/geo

Request capture SDK for AI traffic attribution. It captures every page request your
site serves and sends a neutral request envelope to Notra. All classification, crawler
versus AI referral versus human, happens server side at ingest, so a stale local table
never costs you traffic. Requests classified as human are discarded at ingest and never
stored. The core tracker ships no signature table. Only the optional
Next.js `tagLinks` path bundles the matcher, because it has to decide at the edge which
responses to rewrite for AI agents.

Zero dependencies. No Node APIs in the core, so it runs on edge runtimes.

## Install

```bash
bun add @usenotra/geo
```

## Next.js

```ts
// proxy.ts on Next.js 16, middleware.ts before that
import { createGeoProxy } from "@usenotra/geo/next";
import { NextResponse } from "next/server";

const geo = createGeoProxy({ token: process.env.NOTRA_GEO_TOKEN ?? "" });

export function proxy(request: Request, event: { waitUntil(p: Promise<unknown>): void }) {
  geo(request, event);
  return NextResponse.next();
}
```

`geo(request, event)` never throws and never blocks the response. When an event with
`waitUntil` is passed, the send is registered on it so it survives the response.

## Nuxt and Nitro

```ts
// server/middleware/geo.ts
import { createGeoHandler } from "@usenotra/geo/nuxt";

const geo = createGeoHandler({ token: process.env.NOTRA_GEO_TOKEN ?? "" });

export default defineEventHandler(async (event) => {
  await geo(event);
});
```

The handler accepts an H3 event with a `node.req`, or any object exposing a standard
web `request`. Geo headers are usually absent behind Nitro, so those fields stay
undefined and ingest falls back to IP based lookup.

## TanStack Start

```ts
// src/start.ts
import { createMiddleware, createStart } from "@tanstack/react-start";
import { createGeoMiddleware } from "@usenotra/geo/tanstack";

const geo = createMiddleware().server(createGeoMiddleware({
  token: process.env.NOTRA_GEO_TOKEN!,
  endpoint: "https://app.usenotra.com",
}));

export const startInstance = createStart(() => ({
  requestMiddleware: [geo],
}));
```

The middleware captures requests alongside your route handler and waits for the send before returning, so tracking completes on serverless hosts. It preserves the downstream response and errors. If `src/start.ts` already exists, add `geo` to its existing `requestMiddleware` array.

## Astro

```ts
// src/middleware.ts
import { createGeoMiddleware } from "@usenotra/geo/astro";

export const onRequest = createGeoMiddleware({
  token: import.meta.env.NOTRA_GEO_TOKEN ?? "",
  endpoint: "https://app.usenotra.com",
});
```

The middleware captures requests alongside your route handler and waits for the send before returning. If `src/middleware.ts` already exists, compose with `sequence` from `astro:middleware`. Astro must serve pages from a server adapter (`output: "server"` or hybrid) so requests exist at runtime; a static build has nothing to capture after deploy.

## SvelteKit

```ts
// src/hooks.server.ts
import { env } from "$env/dynamic/private";
import { createGeoHandle } from "@usenotra/geo/sveltekit";

export const handle = createGeoHandle({
  token: env.NOTRA_GEO_TOKEN ?? "",
  endpoint: "https://app.usenotra.com",
});
```

The handle captures requests alongside `resolve` and waits for the send before returning. If `src/hooks.server.ts` already has a `handle`, compose with `sequence` from `@sveltejs/kit/hooks`.

## Netlify Edge Functions

```ts
// netlify/edge-functions/geo.ts
import { createGeoHandler } from "@usenotra/geo/netlify";

const geo = createGeoHandler({ token: Deno.env.get("NOTRA_GEO_TOKEN") ?? "" });

export default (request: Request, context: Context) => {
  geo(request, context);
};

export const config = { path: "/*" };
```

Netlify's `context.geo` is mapped into the envelope and `context.waitUntil` keeps the
send alive.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `token` | required | Per organization ingest token |
| `endpoint` | `https://app.usenotra.com` | Ingest origin, the SDK appends `/api/geo/ingest` |
| `exclude` | `["/api"]` | Paths to skip. Pass `[]` to disable |
| `sample` | `1` | Fraction of eligible requests to send, 0 to 1 |
| `onError` | none | Called with anything that goes wrong. The SDK never throws |
| `fetch` | global `fetch` | Injectable fetch, for tests |

### What gets captured

Only `GET` requests that look like pages. Asset requests are skipped: anything under
`/_next/`, `/_nuxt/`, `/_vercel/`, `/_astro/`, `/_app/`, `/static/`, and any path ending in a
common static extension such as `.css`, `.js`, `.png`, `.svg`, `.xml` or `.txt`.
`llms.txt` and `llms-full.txt` are the exception: they are always captured.

`exclude` entries can be:

- a string, matching that path and everything below it, so `"/api"` also excludes
  `/api/users`
- a `RegExp`, tested against the pathname
- a function `(request, url) => boolean`

Passing `exclude: []` removes the default and captures every page path.

## Payload

Each capture POSTs this JSON to `${endpoint}/api/geo/ingest` with an
`authorization: Bearer <token>` header, `keepalive`, and a 2 second timeout.

```ts
type GeoRequestPayload = {
  timestamp?: string;
  method: string;
  url: string;
  ip?: string;
  geo?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
    latitude?: string;
    longitude?: string;
  };
  referer?: string;
  userAgent?: string;
  accept?: string;
  acceptLanguage?: string;
  requestId?: string;
};
```

`ip` comes from the first entry of `x-forwarded-for`, then `x-real-ip`, then
`x-vercel-forwarded-for`. `geo` comes from the `x-vercel-ip-*` headers with
`cf-ipcountry` as a country fallback, or from the platform context on Netlify.
`requestId` comes from `x-request-id` or `x-vercel-id`.

No request body, no cookies, and no headers beyond the ones listed above are ever
read or sent.

## Journey attribution for markdown

`@usenotra/geo/markdown` tags the links you hand to an agent so every follow up
request is attributed to the same crawl session. Links carry a short `ntr` id,
and the ingest side stores it as the journey for that visit.

```ts
import {
  getJourneyId,
  mintJourneyId,
  tagMarkdownLinks,
} from "@usenotra/geo/markdown";

export async function GET(request: Request) {
  const markdown = await readMarkdown();
  const journeyId = getJourneyId(request) ?? mintJourneyId();

  return new Response(
    tagMarkdownLinks(markdown, journeyId, { host: "example.com" }),
    { headers: { "content-type": "text/markdown; charset=utf-8" } }
  );
}
```

- `mintJourneyId()` returns a new url safe id built from `crypto.getRandomValues`
- `getJourneyId(request)` reads a valid `ntr` param from a `Request`, `URL` or
  string and returns `null` when there is none
- `tagMarkdownLinks(markdown, journeyId, options)` rewrites inline links and
  reference definitions in place

Only same site targets are tagged: paths starting with `/`, and absolute urls
whose host matches `options.host`. Existing query strings are preserved
(`/docs?a=1` becomes `/docs?a=1&ntr=<id>`), fragments stay at the end
(`/docs?a=1#usage` becomes `/docs?a=1&ntr=<id>#usage`), and anchors, `mailto:`,
`tel:`, image embeds, external hosts and links that already carry an `ntr` param
are left untouched. Fenced code blocks and inline code spans are never rewritten.

Requests captured by the tracker already carry the full url, so no tracker
configuration is needed for journeys to show up.

## One-switch tagging (Next.js)

On Next.js you do not have to touch every markdown route. Turn on `tagLinks` and the
proxy tags markdown responses for AI agents on the way out.

```ts
// proxy.ts on Next.js 16, middleware.ts before that
import { createGeoProxy } from "@usenotra/geo/next";
import { NextResponse } from "next/server";

const geo = createGeoProxy({
  token: process.env.NOTRA_GEO_TOKEN ?? "",
  tagLinks: true,
});

export async function proxy(request: Request, event: { waitUntil(p: Promise<unknown>): void }) {
  const tagged = await geo(request, event);
  if (tagged) {
    return tagged;
  }
  return NextResponse.next();
}
```

`tagLinks` accepts `true` for the defaults, or an object:

| Field | Default | Meaning |
| --- | --- | --- |
| `host` | request hostname | Host treated as same site when tagging absolute urls |
| `paths` | `.md`, `llms.txt`, `llms-full.txt` | Which routes are markdown shaped |
| `html` | `false` | Also tag the anchors in HTML pages served to AI agents |

`paths` entries use the same matching semantics as `exclude`: a string matches that
path and everything below it, a `RegExp` is tested against the pathname.

### Mechanics

For each request the proxy checks, in order:

1. the loop guard header `x-notra-geo-tag` is absent
2. the method is `GET`
3. the user agent matches a known AI agent from the shipped signature table
4. the pathname matches one of the `paths` matchers

When all four hold, the proxy resolves the journey id from the incoming `ntr` param or
mints a new one, then fetches the same url again with the original request headers plus
`x-notra-geo-tag: 1`. That second request re-enters the proxy, sees the guard header and
falls straight through to your route, so there is no loop. The origin response is only
rewritten when it is `ok` and its content type contains `text/markdown` or `text/plain`.
Anything else falls through untouched and the proxy behaves exactly as it did before.

### HTML pages

With `html: true` the same flow covers ordinary pages. When the pathname does not match
the markdown matchers, the proxy falls back to the HTML path: it applies the tracker's
own filter first, so `/api`, everything in `exclude`, and every asset path or static
extension are skipped and never refetched. The origin response is rewritten only when it
is `ok` and its content type contains `text/html`. Markdown always wins on markdown
shaped paths, so nothing about the existing behaviour changes.

`tagHtmlLinks(html, journeyId, options)` is also exported on its own from
`@usenotra/geo/html` for stacks without the Next.js proxy.

What it rewrites, and only this: the `href` of `<a>` start tags, single or double
quoted, when the target is a path starting with `/` or an absolute url whose host
matches `options.host`. Existing query strings and fragments survive, with the param
inserted before the fragment, and `&amp;` encoded queries stay encoded.

What it never touches:

- `<link>` tags, so `rel="canonical"`, stylesheets, preloads and alternates are left
  exactly as the origin wrote them
- `src` attributes on images, scripts, iframes and media
- anything inside `<script>` or `<style>`, since the rewrite is scoped to `<a` start
  tags
- `mailto:`, `tel:`, `javascript:`, `data:` and fragment only hrefs
- protocol relative urls pointing at another host, and any external host
- urls that already carry an `ntr` param

An invalid journey id returns the input unchanged. Relative hrefs that do not start
with `/` are left alone rather than guessed at.

Because the whole path is gated on the AI agent user agent check, human visitors and
search crawlers get the untouched origin response byte for byte. There is no cloaking
of content, only an extra query param on internal links for agents, and no effect on
your CDN or browser caching for normal traffic.

On success the request is tracked as usual and the proxy returns a new `Response` with
the tagged body, the origin status and the origin headers minus `content-length`.

Human traffic never pays for this: the agent check happens before the origin fetch, so a
normal browser request goes through the untouched path.

Tagging needs no ingest token. With `token` empty the proxy still tags and simply sends
no envelope.

### Other stacks

`tagMarkdownLinks` stays the way to tag per route on Nuxt, Astro, SvelteKit, Netlify or anything else.
Call it inside the handler that builds the markdown, as shown above.

## Core API

`@usenotra/geo` exports the pieces the framework adapters are built from:

- `Tracker` — `new Tracker(options).track(request)` returns a promise that never
  rejects
- `serializeRequest(request)` — builds the envelope from a standard `Request`
- `shouldTrackRequest(request, url, exclude?)` — the GET, asset and exclude filter
- `sendRequestLog(payload, options)` — the fire and forget POST

## Signature table

`@usenotra/geo/signatures` and `@usenotra/geo/classify` still ship the sourced AI agent
signature table and its matcher. The tracker does not use them. The ingest side uses
them to classify each captured envelope server side, and the Next.js `tagLinks` proxy
uses the matcher locally to decide which responses to tag. Every entry carries a
`source` URL and a confidence of `verified`, `reported` or `heuristic`. See
[SOURCES.md](./SOURCES.md), which also documents agents that are deliberately absent
because they cannot be honestly detected by user agent, including Pi, ChatGPT Atlas,
`Google-Extended` and `Applebot-Extended`.

User agent matching is spoofable. The `verification` field on each signature points at
the operator's published IP range list or reverse DNS method where one exists.

## Agent feedback

`@usenotra/geo/feedback` adds a `submit_feedback` tool to your MCP server so the agents using your product can report bugs, request features and leave praise in your Notra inbox. Copy your feedback URL from the Feedback page in your dashboard. It is unique to your organization and needs no token.

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFeedbackTool } from "@usenotra/geo/feedback";

const server = new McpServer({ name: "acme", version: "1.0.0" });

registerFeedbackTool(server, {
  url: "https://api.usenotra.com/v1/feedback/acme",
  productName: "Acme",
});
```

Outside of MCP, `submitFeedback(input, { url })` posts a single entry and resolves with `{ id, deduplicated }`. The MCP helper needs `zod` (already required by the MCP SDK); the plain client has no dependencies.

## License

MIT. Copyright (c) 2026 Notra, Inc. See [LICENSE](./LICENSE).
