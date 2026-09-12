import { createHmac, timingSafeEqual } from "node:crypto";

import { redis } from "@notra/ai/utils/redis";
import { db } from "@notra/db/drizzle";
import { organizations, projects } from "@notra/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { Effect } from "effect";

import {
  GEO_INGEST_HOSTS_CACHE_PREFIX,
  GEO_INGEST_IDENTITY_ACTIVE_TTL_SECONDS,
  GEO_INGEST_IDENTITY_INACTIVE_TTL_SECONDS,
  GEO_INGEST_PATH,
  GEO_INGEST_SECRET_ENV,
  GEO_INGEST_SECRET_FALLBACK_ENV,
  GEO_INGEST_TOKEN_ENV,
  GEO_INGEST_TOKEN_GENERATION_CACHE_PREFIX,
  GEO_INGEST_TOKEN_SEPARATOR,
} from "../constants/geo";
import type {
  GeoIngestFramework,
  GeoIngestIdentity,
  GeoIngestSetupInfo,
  GeoIngestSetupResponse,
  GeoIngestSnippets,
  GeoScopeInput,
} from "../types/geo";
import { geoDb } from "./effect";
import { resolveGeoScope } from "./projects";

/**
 * Tracking-token issuing, revocation and install snippets.
 *
 * This used to live in `apps/dashboard/src/lib/geo-ingest/*`. It is entirely
 * Next-free — `node:crypto`, drizzle, Upstash and `process.env` — and the
 * public API needs the exact same answers as the dashboard, so it moved here
 * rather than being copied. The dashboard modules now re-export from this file,
 * which keeps a single implementation and leaves every existing dashboard
 * import path working.
 */

const MISSING = "missing";
const GENERATION_SEGMENT_REGEX = /^g\d+$/;
const FALLBACK_APP_URL = "https://app.usenotra.com";
const CACHE_GENERATION_SCRIPT = `
local current = redis.call("GET", KEYS[1])
local incoming = ARGV[1]
local ttl = tonumber(ARGV[2])

if incoming == "${MISSING}" then
  if not current then
    redis.call("SET", KEYS[1], incoming, "EX", ttl)
    return 1
  end
  return 0
end

local currentNumber = tonumber(current)
if not current or current == "${MISSING}" or not currentNumber or currentNumber <= tonumber(incoming) then
  redis.call("SET", KEYS[1], incoming, "EX", ttl)
  return 1
end

return 0
`;

function generationCacheKey(organizationId: string): string {
  return `${GEO_INGEST_TOKEN_GENERATION_CACHE_PREFIX}:${organizationId}`;
}

export function geoIngestHostsCacheKey(
  organizationId: string,
  projectId: string | null
): string {
  return `${GEO_INGEST_HOSTS_CACHE_PREFIX}:${organizationId}:${projectId ?? "-"}`;
}

/**
 * Drop the cached allowlist after settings change so a newly added domain
 * is accepted immediately. Org-scoped tokens union every project, so that
 * key is cleared too.
 */
export async function invalidateGeoIngestHostsCache(
  organizationId: string,
  projectId: string | null
): Promise<void> {
  const client = redis;
  if (!client) {
    return;
  }
  const keys = [geoIngestHostsCacheKey(organizationId, projectId)];
  if (projectId) {
    keys.push(geoIngestHostsCacheKey(organizationId, null));
  }
  await Promise.all(keys.map((key) => client.del(key).catch(() => null)));
}

/**
 * Brand website changes affect every project linked to that voice, including
 * org-scoped tokens that union those hosts.
 */
export async function invalidateGeoIngestHostsCacheForBrand(
  organizationId: string,
  brandSettingsId: string
): Promise<void> {
  const client = redis;
  if (!client) {
    return;
  }
  const rows = await db.query.projects.findMany({
    columns: { id: true },
    where: and(
      eq(projects.organizationId, organizationId),
      eq(projects.brandSettingsId, brandSettingsId)
    ),
  });
  const keys = [
    geoIngestHostsCacheKey(organizationId, null),
    ...rows.map((row) => geoIngestHostsCacheKey(organizationId, row.id)),
  ];
  await Promise.all(keys.map((key) => client.del(key).catch(() => null)));
}

async function cacheGeneration(
  organizationId: string,
  value: number | null
): Promise<void> {
  const client = redis;
  if (!client) {
    return;
  }
  const encoded = value === null ? MISSING : String(value);
  const ttl =
    value === null
      ? GEO_INGEST_IDENTITY_INACTIVE_TTL_SECONDS
      : GEO_INGEST_IDENTITY_ACTIVE_TTL_SECONDS;
  await client
    .eval(
      CACHE_GENERATION_SCRIPT,
      [generationCacheKey(organizationId)],
      [encoded, String(ttl)]
    )
    .catch(() => null);
}

/**
 * The organization's current tracking-token generation, or null when the
 * organization no longer exists. Cached briefly; rotation writes through the
 * cache so revocation takes effect immediately.
 */
export async function getGeoIngestTokenGeneration(
  organizationId: string
): Promise<number | null> {
  const client = redis;
  if (client) {
    const cached = await client
      .get<string | number>(generationCacheKey(organizationId))
      .catch(() => null);
    if (cached === MISSING) {
      return null;
    }
    const parsed = typeof cached === "number" ? cached : Number(cached);
    if (Number.isInteger(parsed) && parsed >= 1) {
      return parsed;
    }
  }

  const row = await db.query.organizations.findFirst({
    columns: { geoIngestTokenGeneration: true },
    where: eq(organizations.id, organizationId),
  });
  const generation = row?.geoIngestTokenGeneration ?? null;
  await cacheGeneration(organizationId, generation);
  return generation;
}

/**
 * Revoke every outstanding tracking token for the organization by bumping the
 * generation. Returns the new generation.
 */
async function rotateGeoIngestTokenGeneration(
  organizationId: string
): Promise<number | null> {
  const [row] = await db
    .update(organizations)
    .set({
      geoIngestTokenGeneration: sql`${organizations.geoIngestTokenGeneration} + 1`,
    })
    .where(eq(organizations.id, organizationId))
    .returning({ generation: organizations.geoIngestTokenGeneration });
  if (!row) {
    return null;
  }
  await cacheGeneration(organizationId, row.generation);
  return row.generation;
}

export function getGeoIngestSecret(): string | null {
  const secret =
    process.env[GEO_INGEST_SECRET_ENV] ??
    process.env[GEO_INGEST_SECRET_FALLBACK_ENV];
  return secret && secret.length > 0 ? secret : null;
}

export function isGeoIngestConfigured(): boolean {
  return getGeoIngestSecret() !== null;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function buildGeoIngestToken(
  organizationId: string,
  projectId: string | undefined,
  generation: number
): string | null {
  const secret = getGeoIngestSecret();
  if (!secret) {
    return null;
  }
  const segments = [organizationId];
  if (projectId) {
    segments.push(projectId);
  }
  if (generation > 1) {
    segments.push(`g${generation}`);
  }
  const payload = segments.join(GEO_INGEST_TOKEN_SEPARATOR);
  const signature = sign(payload, secret);
  return `${payload}${GEO_INGEST_TOKEN_SEPARATOR}${signature}`;
}

export function verifyGeoIngestToken(token: string): GeoIngestIdentity | null {
  const secret = getGeoIngestSecret();
  if (!secret) {
    return null;
  }

  const separatorIndex = token.lastIndexOf(GEO_INGEST_TOKEN_SEPARATOR);
  if (separatorIndex <= 0) {
    return null;
  }

  const payload = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  const expected = sign(payload, secret);
  if (signature.length !== expected.length) {
    return null;
  }

  const matches = timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
  if (!matches) {
    return null;
  }

  const segments = payload.split(GEO_INGEST_TOKEN_SEPARATOR);
  let generation = 1;
  const last = segments.at(-1);
  if (segments.length > 1 && last && GENERATION_SEGMENT_REGEX.test(last)) {
    generation = Number.parseInt(last.slice(1), 10);
    segments.pop();
  }

  const [organizationId, projectId] = segments;
  if (!organizationId) {
    return null;
  }

  return { organizationId, projectId: projectId || null, generation };
}

export function buildGeoAppUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? FALLBACK_APP_URL;
  return new URL("/", base).origin;
}

export function buildGeoIngestUrl(): string {
  return new URL(GEO_INGEST_PATH, buildGeoAppUrl()).toString();
}

function processTokenExpr(): string {
  return `process.env.${GEO_INGEST_TOKEN_ENV}!`;
}

function denoTokenExpr(): string {
  return `Deno.env.get("${GEO_INGEST_TOKEN_ENV}")!`;
}

function buildNextSnippet(appUrl: string): string {
  return [
    'import { createGeoProxy } from "@usenotra/geo/next";',
    'import { after, NextResponse } from "next/server";',
    "",
    "const geo = createGeoProxy({",
    `  token: ${processTokenExpr()},`,
    `  endpoint: "${appUrl}",`,
    "});",
    "",
    "export function proxy(request: Request) {",
    "  after(() => geo(request));",
    "  return NextResponse.next();",
    "}",
  ].join("\n");
}

function buildNuxtSnippet(appUrl: string): string {
  return [
    'import { createGeoHandler } from "@usenotra/geo/nuxt";',
    "",
    "const geo = createGeoHandler({",
    `  token: ${processTokenExpr()},`,
    `  endpoint: "${appUrl}",`,
    "});",
    "",
    "export default defineEventHandler(async (event) => {",
    "  await geo(event);",
    "});",
  ].join("\n");
}

function buildNetlifySnippet(appUrl: string): string {
  return [
    'import { createGeoHandler } from "@usenotra/geo/netlify";',
    'import type { Context } from "@netlify/edge-functions";',
    "",
    "const geo = createGeoHandler({",
    `  token: ${denoTokenExpr()},`,
    `  endpoint: "${appUrl}",`,
    "});",
    "",
    "export default (request: Request, context: Context) => {",
    "  geo(request, context);",
    "};",
    "",
    'export const config = { path: "/*" };',
  ].join("\n");
}

export function buildGeoSnippet(
  appUrl: string,
  framework: GeoIngestFramework = "next"
): string {
  if (framework === "nuxt") {
    return buildNuxtSnippet(appUrl);
  }
  if (framework === "netlify") {
    return buildNetlifySnippet(appUrl);
  }
  return buildNextSnippet(appUrl);
}

export function buildGeoSnippets(appUrl: string): GeoIngestSnippets {
  return {
    next: buildGeoSnippet(appUrl, "next"),
    nuxt: buildGeoSnippet(appUrl, "nuxt"),
    netlify: buildGeoSnippet(appUrl, "netlify"),
  };
}

/**
 * The install payload without the token.
 *
 * The snippets name the token's environment variable rather than its value, so
 * nothing here is a credential. That matters for the public API: reading setup
 * only costs `traffic.read`, while the token is a write credential (it lets the
 * holder post events), so the read path builds this and never the token.
 */
export function buildGeoIngestSetupInfo(): GeoIngestSetupInfo {
  const snippets = buildGeoSnippets(buildGeoAppUrl());
  return {
    ingestUrl: buildGeoIngestUrl(),
    snippet: snippets.next,
    snippets,
  };
}

/**
 * The full "how do I install tracking" payload, token included.
 *
 * Lifted verbatim out of the dashboard's `geo.ingestSetup` oRPC procedure so
 * both surfaces answer identically. `token` is `""` when `GEO_INGEST_SECRET`
 * is unset — the dashboard renders that as "not configured yet"; the public API
 * turns it into a 503 instead, because an empty token is not a usable answer.
 */
function buildGeoIngestSetupResponse(
  input: GeoScopeInput,
  generation: number
): GeoIngestSetupResponse {
  return {
    ...buildGeoIngestSetupInfo(),
    token:
      buildGeoIngestToken(input.organizationId, input.projectId, generation) ??
      "",
  };
}

/**
 * Issues a token only after proving an optional project belongs to the
 * organization. A missing organization returns `null` rather than signing a
 * generation-one token for an identity that does not exist.
 */
export const issueGeoIngestSetupResponse = Effect.fn("geo.ingest.issueSetup")(
  function* (input: GeoScopeInput) {
    if (input.projectId) {
      yield* resolveGeoScope(input);
    }

    const generation = yield* geoDb(
      "ingest token generation lookup failed",
      () => getGeoIngestTokenGeneration(input.organizationId)
    );
    if (generation === null) {
      return null;
    }
    return buildGeoIngestSetupResponse(input, generation);
  }
);

/**
 * Validates the optional project before revoking existing tokens. This order
 * matters: a caller must not be able to bump the organization's generation by
 * supplying a project owned by somebody else.
 */
export const rotateGeoIngestSetupResponse = Effect.fn("geo.ingest.rotateSetup")(
  function* (input: GeoScopeInput) {
    if (input.projectId) {
      yield* resolveGeoScope(input);
    }

    const generation = yield* geoDb("ingest token rotation failed", () =>
      rotateGeoIngestTokenGeneration(input.organizationId)
    );
    if (generation === null) {
      return null;
    }
    return buildGeoIngestSetupResponse(input, generation);
  }
);
