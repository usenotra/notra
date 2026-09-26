import { db } from "@notra/db/drizzle";
import {
  geoPromptSuggestions,
  googleSearchConsoleIntegrations,
  projects,
} from "@notra/db/schema";
import { and, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { customAlphabet } from "nanoid";

import {
  ACCESS_TOKEN_REFRESH_BUFFER_MS,
  DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
  GSC_DATA_LAG_DAYS,
  GSC_MAX_ROW_LIMIT,
  GSC_OAUTH_REVOKE_URL,
  GSC_OAUTH_TOKEN_URL,
  GSC_SEARCH_ANALYTICS_BASE_URL,
  GSC_SITES_URL,
  GSC_TOKEN_REVOKE_TIMEOUT_MS,
  GSC_USERINFO_URL,
  MS_PER_DAY,
  REAUTH_ERROR_CODES,
} from "../constants/google-search-console";
import { decryptToken, encryptToken } from "../crypto/token-encryption";
import {
  gscSearchAnalyticsResponseSchema,
  gscSitesResponseSchema,
  gscTokenErrorSchema,
  gscTokenResponseSchema,
  gscUserInfoSchema,
} from "../schemas/google-search-console";
import type {
  ExchangeGscAuthorizationCodeParams,
  ExchangeGscAuthorizationCodeResult,
  GscIntegrationRow,
  GscIntegrationUpdate,
  GscOAuthCredentials,
  GscQueryRow,
  GscSite,
  QueryGscTopQueriesParams,
  UpsertGscIntegrationParams,
} from "../types/google-search-console";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 16);

export function getGscOAuthCredentials(): GscOAuthCredentials | null {
  const clientId = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET?.trim();
  if (!(clientId && clientSecret)) {
    return null;
  }
  return { clientId, clientSecret };
}

export class GscReauthRequiredError extends Error {
  constructor(message = "Google Search Console access must be re-authorized") {
    super(message);
    this.name = "GscReauthRequiredError";
  }
}

export class GscDisconnectInProgressError extends Error {
  constructor() {
    super("Google Search Console disconnect is still in progress");
    this.name = "GscDisconnectInProgressError";
  }
}

export class GscApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GscApiError";
    this.status = status;
  }
}

function parseTokenError(payload: unknown): {
  code: string | undefined;
  description: string | undefined;
} {
  const parsed = gscTokenErrorSchema.safeParse(payload);
  return {
    code: parsed.success ? parsed.data.error : undefined,
    description: parsed.success ? parsed.data.error_description : undefined,
  };
}

function toExpiresAt(expiresInSeconds: number | undefined): Date {
  const seconds = expiresInSeconds ?? DEFAULT_ACCESS_TOKEN_TTL_SECONDS;
  return new Date(Date.now() + seconds * 1000);
}

export async function exchangeGscAuthorizationCode(
  params: ExchangeGscAuthorizationCodeParams
): Promise<ExchangeGscAuthorizationCodeResult> {
  const credentials = getGscOAuthCredentials();
  if (!credentials) {
    throw new Error("Google OAuth is not configured");
  }

  const response = await fetch(GSC_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      code: params.code,
      grant_type: "authorization_code",
      redirect_uri: params.redirectUri,
    }),
    signal: params.signal,
  });

  const payload = await response.json();
  const parsed = gscTokenResponseSchema.safeParse(payload);
  if (!(response.ok && parsed.success)) {
    const { code, description } = parseTokenError(payload);
    throw new GscApiError(
      description ?? code ?? "Google token exchange failed",
      response.status
    );
  }

  return {
    accessToken: parsed.data.access_token,
    refreshToken: parsed.data.refresh_token ?? null,
    expiresAt: toExpiresAt(parsed.data.expires_in),
  };
}

export async function fetchGscAccountEmail(
  accessToken: string,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const response = await fetch(GSC_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    });
    if (!response.ok) {
      return null;
    }
    const parsed = gscUserInfoSchema.safeParse(await response.json());
    return parsed.success ? (parsed.data.email ?? null) : null;
  } catch {
    signal?.throwIfAborted();
    return null;
  }
}

export async function getGscIntegration(
  organizationId: string
): Promise<GscIntegrationRow | null> {
  const row = await db.query.googleSearchConsoleIntegrations.findFirst({
    where: eq(googleSearchConsoleIntegrations.organizationId, organizationId),
  });
  return row ?? null;
}

export function hasGscGoogleAccountChanged(
  previousEmail: string | null | undefined,
  nextEmail: string | null
): boolean {
  const previous = previousEmail?.trim().toLowerCase();
  const next = nextEmail?.trim().toLowerCase();
  // Userinfo can fail, return malformed JSON, or omit email. If we cannot
  // confirm the next identity, treat the account as changed so reconnect
  // never keeps the previous property or weekly schedule under new tokens.
  if (!next) {
    return true;
  }
  if (!previous) {
    return false;
  }
  return previous !== next;
}

export function shouldClearGscSiteOnReconnect(
  existing: Pick<GscIntegrationRow, "googleAccountEmail" | "siteUrl"> | null,
  nextEmail: string | null
): boolean {
  if (!existing) {
    return false;
  }
  if (hasGscGoogleAccountChanged(existing.googleAccountEmail, nextEmail)) {
    return true;
  }
  // A selected property with no stored email cannot be proven to belong to
  // the account that just signed in.
  return Boolean(existing.siteUrl && !existing.googleAccountEmail?.trim());
}

export async function upsertGscIntegration(
  params: UpsertGscIntegrationParams,
  signal?: AbortSignal,
  assertLockOwned?: () => Promise<void>
): Promise<GscIntegrationRow> {
  signal?.throwIfAborted();
  const encryptedAccessToken = encryptToken(params.accessToken);
  const encryptedRefreshToken = encryptToken(params.refreshToken);

  const { integrationToRevoke, row } = await db.transaction(async (tx) => {
    // The advisory lock also serializes first-time inserts, where there is no
    // row for SELECT FOR UPDATE to lock yet.
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`gsc-integration:${params.organizationId}`}, 0))`
    );
    await assertLockOwned?.();
    signal?.throwIfAborted();
    const existing = await tx.query.googleSearchConsoleIntegrations.findFirst({
      where: eq(
        googleSearchConsoleIntegrations.organizationId,
        params.organizationId
      ),
    });
    if (existing?.disconnectingAt) {
      throw new GscDisconnectInProgressError();
    }
    const oldSiteMustBeCleared = shouldClearGscSiteOnReconnect(
      existing ?? null,
      params.googleAccountEmail
    );
    const selectedProject =
      existing && !existing.googleAccountEmail?.trim()
        ? await tx.query.projects.findFirst({
            columns: { id: true },
            where: and(
              eq(projects.organizationId, params.organizationId),
              isNotNull(projects.gscSiteUrl)
            ),
          })
        : null;
    const googleAccountChanged =
      !existing || oldSiteMustBeCleared || Boolean(selectedProject);

    signal?.throwIfAborted();
    const [row] = await tx
      .insert(googleSearchConsoleIntegrations)
      .values({
        id: `gsc_${nanoid()}`,
        organizationId: params.organizationId,
        createdByUserId: params.userId,
        googleAccountEmail: params.googleAccountEmail,
        encryptedAccessToken,
        encryptedRefreshToken,
        accessTokenExpiresAt: params.expiresAt,
        status: "active",
        lastError: null,
      })
      .onConflictDoUpdate({
        target: googleSearchConsoleIntegrations.organizationId,
        set: {
          createdByUserId: params.userId,
          googleAccountEmail: params.googleAccountEmail,
          encryptedAccessToken,
          encryptedRefreshToken,
          accessTokenExpiresAt: params.expiresAt,
          status: "active",
          lastError: null,
          ...(googleAccountChanged
            ? {
                siteUrl: null,
                topQueries: [],
              }
            : {}),
        },
      })
      .returning();

    if (!row) {
      throw new Error("Failed to save Google Search Console integration");
    }

    if (!existing || googleAccountChanged) {
      signal?.throwIfAborted();
      await tx
        .delete(geoPromptSuggestions)
        .where(
          and(
            eq(geoPromptSuggestions.source, "search_console"),
            eq(geoPromptSuggestions.organizationId, params.organizationId),
            eq(geoPromptSuggestions.status, "pending")
          )
        );
    }
    if (googleAccountChanged) {
      await tx
        .update(projects)
        .set({
          gscSiteUrl: null,
          gscTopQueries: [],
          gscLastSyncedAt: null,
          gscLastError: null,
        })
        .where(eq(projects.organizationId, params.organizationId));
    }

    return {
      row,
      // Missing identity requires clearing cached property data, but does not
      // prove the old grant belongs to a different Google account.
      integrationToRevoke:
        existing?.googleAccountEmail?.trim() &&
        params.googleAccountEmail?.trim() &&
        hasGscGoogleAccountChanged(
          existing.googleAccountEmail,
          params.googleAccountEmail
        )
          ? existing
          : null,
    };
  });

  // The OAuth callback keeps its organization lock through revocation so a
  // later callback cannot mint or install a replacement grant in parallel.
  // The database transaction is already committed and its connection freed,
  // so losing the lock here must not read as a failed connection: skip the
  // old grant's revocation instead of unwinding a saved integration.
  if (integrationToRevoke) {
    try {
      await assertLockOwned?.();
      signal?.throwIfAborted();
    } catch (error) {
      console.error(
        "[GSC] Integration lock lost after saving the connection; skipping revocation of the previous grant:",
        error
      );
      return row;
    }
    await revokeGscToken(integrationToRevoke, signal);
  }
  return row;
}

export async function updateGscIntegration(
  organizationId: string,
  updates: GscIntegrationUpdate
): Promise<GscIntegrationRow | null> {
  const [row] = await db
    .update(googleSearchConsoleIntegrations)
    .set(updates)
    .where(
      and(
        eq(googleSearchConsoleIntegrations.organizationId, organizationId),
        isNull(googleSearchConsoleIntegrations.disconnectingAt)
      )
    )
    .returning();
  return row ?? null;
}

export async function claimOrConfirmGscSchedule(
  integration: GscIntegrationRow,
  scheduleId: string,
  signal?: AbortSignal,
  assertLockOwned?: () => Promise<void>
): Promise<GscIntegrationRow | null> {
  return await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`gsc-integration:${integration.organizationId}`}, 0))`
    );
    await assertLockOwned?.();
    signal?.throwIfAborted();
    const [row] = await tx
      .update(googleSearchConsoleIntegrations)
      .set({ qstashScheduleId: scheduleId })
      .where(
        and(
          eq(googleSearchConsoleIntegrations.id, integration.id),
          eq(
            googleSearchConsoleIntegrations.organizationId,
            integration.organizationId
          ),
          isNull(googleSearchConsoleIntegrations.disconnectingAt),
          or(
            eq(googleSearchConsoleIntegrations.qstashScheduleId, scheduleId),
            and(
              integration.googleAccountEmail === null
                ? isNull(googleSearchConsoleIntegrations.googleAccountEmail)
                : sql`lower(trim(${googleSearchConsoleIntegrations.googleAccountEmail})) = ${integration.googleAccountEmail.trim().toLowerCase()}`,
              eq(googleSearchConsoleIntegrations.status, integration.status),
              isNull(googleSearchConsoleIntegrations.qstashScheduleId),
              integration.lastSyncedAt === null
                ? isNull(googleSearchConsoleIntegrations.lastSyncedAt)
                : eq(
                    googleSearchConsoleIntegrations.lastSyncedAt,
                    integration.lastSyncedAt
                  ),
              integration.siteUrl === null
                ? isNull(googleSearchConsoleIntegrations.siteUrl)
                : eq(
                    googleSearchConsoleIntegrations.siteUrl,
                    integration.siteUrl
                  )
            )
          )
        )
      )
      .returning();
    return row ?? null;
  });
}

export async function updateGscIntegrationIfUnchanged(
  integration: GscIntegrationRow,
  updates: GscIntegrationUpdate,
  executor: Pick<typeof db, "update"> = db
): Promise<GscIntegrationRow | null> {
  const [row] = await executor
    .update(googleSearchConsoleIntegrations)
    .set(updates)
    .where(
      and(
        eq(googleSearchConsoleIntegrations.id, integration.id),
        eq(
          googleSearchConsoleIntegrations.organizationId,
          integration.organizationId
        ),
        eq(
          googleSearchConsoleIntegrations.encryptedRefreshToken,
          integration.encryptedRefreshToken
        ),
        eq(googleSearchConsoleIntegrations.status, integration.status),
        integration.disconnectingAt === null
          ? isNull(googleSearchConsoleIntegrations.disconnectingAt)
          : eq(
              googleSearchConsoleIntegrations.disconnectingAt,
              integration.disconnectingAt
            ),
        integration.qstashScheduleId === null
          ? isNull(googleSearchConsoleIntegrations.qstashScheduleId)
          : eq(
              googleSearchConsoleIntegrations.qstashScheduleId,
              integration.qstashScheduleId
            ),
        integration.lastSyncedAt === null
          ? isNull(googleSearchConsoleIntegrations.lastSyncedAt)
          : eq(
              googleSearchConsoleIntegrations.lastSyncedAt,
              integration.lastSyncedAt
            ),
        integration.siteUrl === null
          ? isNull(googleSearchConsoleIntegrations.siteUrl)
          : eq(googleSearchConsoleIntegrations.siteUrl, integration.siteUrl)
      )
    )
    .returning();
  return row ?? null;
}

export async function beginGscIntegrationDisconnect(
  organizationId: string,
  signal?: AbortSignal,
  assertLockOwned?: () => Promise<void>
): Promise<GscIntegrationRow | null> {
  return await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`gsc-integration:${organizationId}`}, 0))`
    );
    await assertLockOwned?.();
    signal?.throwIfAborted();
    const [row] = await tx
      .update(googleSearchConsoleIntegrations)
      .set({
        disconnectingAt: sql`coalesce(${googleSearchConsoleIntegrations.disconnectingAt}, now())`,
      })
      .where(eq(googleSearchConsoleIntegrations.organizationId, organizationId))
      .returning();
    return row ?? null;
  });
}

export async function deleteGscIntegration(
  integration: GscIntegrationRow,
  signal?: AbortSignal,
  assertLockOwned?: () => Promise<void>
): Promise<GscIntegrationRow | null> {
  const disconnectingAt = integration.disconnectingAt;
  if (!disconnectingAt) {
    return null;
  }
  return await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`gsc-integration:${integration.organizationId}`}, 0))`
    );
    await assertLockOwned?.();
    signal?.throwIfAborted();
    const [row] = await tx
      .delete(googleSearchConsoleIntegrations)
      .where(
        and(
          eq(googleSearchConsoleIntegrations.id, integration.id),
          eq(
            googleSearchConsoleIntegrations.organizationId,
            integration.organizationId
          ),
          eq(
            googleSearchConsoleIntegrations.encryptedRefreshToken,
            integration.encryptedRefreshToken
          ),
          eq(googleSearchConsoleIntegrations.disconnectingAt, disconnectingAt)
        )
      )
      .returning();
    if (!row) {
      return null;
    }
    await tx
      .delete(geoPromptSuggestions)
      .where(
        and(
          eq(geoPromptSuggestions.source, "search_console"),
          eq(geoPromptSuggestions.organizationId, integration.organizationId),
          eq(geoPromptSuggestions.status, "pending")
        )
      );
    await tx
      .update(projects)
      .set({
        gscSiteUrl: null,
        gscTopQueries: [],
        gscLastSyncedAt: null,
        gscLastError: null,
      })
      .where(eq(projects.organizationId, integration.organizationId));
    return row;
  });
}

export async function revokeGscToken(
  integration: GscIntegrationRow,
  signal?: AbortSignal
): Promise<boolean> {
  try {
    const refreshToken = decryptToken(integration.encryptedRefreshToken);
    const timeoutSignal = AbortSignal.timeout(GSC_TOKEN_REVOKE_TIMEOUT_MS);
    const response = await fetch(GSC_OAUTH_REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken }),
      signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
    });
    if (response.ok || response.status === 400) {
      return true;
    }
    console.error(
      `[GSC] Failed to revoke Google token with status ${response.status}`
    );
    return false;
  } catch (error) {
    signal?.throwIfAborted();
    console.error("[GSC] Failed to revoke Google token:", error);
    return false;
  }
}

async function refreshGscAccessToken(
  integration: GscIntegrationRow
): Promise<string> {
  const credentials = getGscOAuthCredentials();
  if (!credentials) {
    throw new Error("Google OAuth is not configured");
  }

  const refreshToken = decryptToken(integration.encryptedRefreshToken);
  const response = await fetch(GSC_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const payload = await response.json();
  const parsed = gscTokenResponseSchema.safeParse(payload);
  if (!(response.ok && parsed.success)) {
    const { code, description } = parseTokenError(payload);
    if (code && REAUTH_ERROR_CODES.has(code)) {
      await updateGscIntegrationIfUnchanged(integration, {
        status: "reauth_required",
        lastError: description ?? code,
      });
      throw new GscReauthRequiredError();
    }
    throw new GscApiError(
      "Failed to refresh Google access token",
      response.status
    );
  }

  const accessToken = parsed.data.access_token;
  const updated = await updateGscIntegrationIfUnchanged(integration, {
    encryptedAccessToken: encryptToken(accessToken),
    accessTokenExpiresAt: toExpiresAt(parsed.data.expires_in),
    status: "active",
    lastError: null,
  });

  if (!updated) {
    throw new GscApiError(
      "Google Search Console changed while refreshing access. Please try again.",
      409
    );
  }

  return accessToken;
}

export async function getGscAccessToken(
  integration: GscIntegrationRow
): Promise<string> {
  if (integration.disconnectingAt) {
    throw new GscDisconnectInProgressError();
  }
  if (integration.status === "reauth_required") {
    throw new GscReauthRequiredError();
  }
  const expiresSoon =
    integration.accessTokenExpiresAt.getTime() -
      ACCESS_TOKEN_REFRESH_BUFFER_MS <
    Date.now();
  if (!expiresSoon) {
    return decryptToken(integration.encryptedAccessToken);
  }
  return await refreshGscAccessToken(integration);
}

async function gscFetch(
  integration: GscIntegrationRow,
  url: string,
  init?: RequestInit
): Promise<Response> {
  const accessToken = await getGscAccessToken(integration);
  const response = await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.status === 401) {
    const refreshed = await refreshGscAccessToken(integration);
    return await fetch(url, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${refreshed}`,
      },
    });
  }
  return response;
}

export async function listGscSites(
  integration: GscIntegrationRow
): Promise<GscSite[]> {
  const response = await gscFetch(integration, GSC_SITES_URL);
  if (!response.ok) {
    throw new GscApiError(
      "Failed to list Search Console properties",
      response.status
    );
  }
  const parsed = gscSitesResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new GscApiError("Unexpected Search Console response", 502);
  }
  const sites = (parsed.data.siteEntry ?? []).flatMap((entry) => {
    if (entry.permissionLevel === "siteUnverifiedUser") {
      return [];
    }
    return {
      siteUrl: entry.siteUrl,
      permissionLevel: entry.permissionLevel ?? null,
    };
  });
  return sites.sort((a, b) => a.siteUrl.localeCompare(b.siteUrl));
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function queryGscTopQueries(
  integration: GscIntegrationRow,
  params: QueryGscTopQueriesParams
): Promise<GscQueryRow[]> {
  const endDate = new Date(Date.now() - GSC_DATA_LAG_DAYS * MS_PER_DAY);
  const startDate = new Date(endDate.getTime() - params.days * MS_PER_DAY);
  const url = `${GSC_SEARCH_ANALYTICS_BASE_URL}/${encodeURIComponent(params.siteUrl)}/searchAnalytics/query`;

  const response = await gscFetch(integration, url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startDate: toIsoDate(startDate),
      endDate: toIsoDate(endDate),
      dimensions: ["query"],
      type: "web",
      rowLimit: Math.min(params.rowLimit, GSC_MAX_ROW_LIMIT),
    }),
  });

  if (!response.ok) {
    throw new GscApiError(
      "Failed to query Search Console analytics",
      response.status
    );
  }
  const parsed = gscSearchAnalyticsResponseSchema.safeParse(
    await response.json()
  );
  if (!parsed.success) {
    throw new GscApiError("Unexpected Search Console response", 502);
  }

  return (parsed.data.rows ?? []).flatMap((row) => {
    const query = row.keys[0] ?? "";
    if (query.length === 0) {
      return [];
    }
    return {
      query,
      clicks: row.clicks,
      impressions: row.impressions,
      position: row.position,
    };
  });
}
