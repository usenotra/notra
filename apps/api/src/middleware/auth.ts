import type { createDb } from "@notra/db/drizzle";
import { members, organizations, users } from "@notra/db/schema";
import {
  isUnscopedApiPath,
  LEGACY_API_READ_SCOPE,
  LEGACY_API_WRITE_SCOPE,
} from "@notra/utils/api-scopes";
import { readOAuthConsentGrant } from "@notra/utils/oauth-consent";
import { Unkey } from "@unkey/api";
import type {
  Identity,
  V2KeysVerifyKeyResponseData,
} from "@unkey/api/models/components";
import { NotFoundException, WorkOS } from "@workos-inc/node";
import { and, asc, eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import {
  createRemoteJWKSet,
  type JWTPayload,
  errors as joseErrors,
  jwtVerify,
} from "jose";

import { API_AUTH_KINDS } from "../constants/analytics";
import type { ApiAuthKind } from "../types/analytics";
import type { AccountApiKeyAuthData, AuthData } from "../types/auth";
import { ACCOUNT_ORG_HEADERS, parseAccountUserId } from "../types/auth";
import {
  API_URL,
  AUTH_GUIDE_URL,
  RESOURCE_METADATA_URL,
} from "../utils/agent-discovery";
import { trackApiKeyRejected, trackApiKeyVerified } from "../utils/analytics";
import { isFeedbackToken, verifyFeedbackToken } from "../utils/feedback-token";

declare module "hono" {
  interface ContextVariableMap {
    auth: AuthData;
    db: ReturnType<typeof createDb>;
  }
}

interface AuthOptions {
  getKey?: (c: Context) => string | null;
  legacyPermissions?: string[];
  permissions?: string;
}

const BEARER_HEADER_REGEX = /^Bearer\s+(.+)$/i;
const DEFAULT_AUTHKIT_DOMAIN = "oauth.usenotra.com";
const OAUTH_AUDIENCES = [
  API_URL,
  "https://mcp.usenotra.com",
  "https://mcp.usenotra.com/mcp",
] as const;
const SCOPE_SEPARATOR_REGEX = /\s+/;
const WORKOS_ID_CACHE_MAX_SIZE = 1000;
const WORKOS_ID_CACHE_TTL_MS = 5 * 60 * 1000;
const workosIdCache = new Map<string, { localId: string; expiresAt: number }>();
const remoteJwksByUrl = new Map<
  string,
  ReturnType<typeof createRemoteJWKSet>
>();

function extractBearerToken(c: Context): string | null {
  const header = c.req.header("Authorization");
  if (!header) {
    return null;
  }

  const match = BEARER_HEADER_REGEX.exec(header.trim());
  return match?.[1]?.trim() || null;
}

type AuthFailureStatus = 401 | 403 | 429 | 503;

type AuthResult =
  | { success: true; auth: AuthData }
  | {
      success: false;
      error: string;
      status: AuthFailureStatus;
      kind?: ApiAuthKind;
      code?: string;
    };

/**
 * Unkey's verification codes, mapped onto answers a client can act on.
 *
 * The codes are Unkey's internal vocabulary (`Code` in `@unkey/api`): passing
 * one through as the `error` string told the caller of an unknown key that
 * something was `NOT_FOUND` — which reads like a missing resource, not a
 * rejected credential — and leaked how the key store answers. Anything not
 * listed here, including codes Unkey adds later (`Code` is an open enum), gets
 * the generic invalid-key answer rather than its raw name.
 */
const UNKEY_AUTH_FAILURES: Record<
  string,
  { error: string; status: AuthFailureStatus }
> = {
  DISABLED: { error: "Invalid API key", status: 401 },
  EXPIRED: { error: "Invalid API key", status: 401 },
  FORBIDDEN: { error: "Forbidden", status: 403 },
  INSUFFICIENT_PERMISSIONS: { error: "Forbidden", status: 403 },
  NOT_FOUND: { error: "Invalid API key", status: 401 },
  RATE_LIMITED: { error: "API key rate limit exceeded", status: 429 },
  USAGE_EXCEEDED: { error: "API key usage limit exceeded", status: 429 },
};

const DEFAULT_UNKEY_AUTH_FAILURE = {
  error: "Invalid API key",
  status: 401,
} as const;

function getOAuthIssuer(c: Context) {
  const domain = c.env.WORKOS_AUTHKIT_DOMAIN ?? DEFAULT_AUTHKIT_DOMAIN;
  return `https://${domain}`;
}

function getOAuthJwksUrl(c: Context) {
  return `${getOAuthIssuer(c)}/oauth2/jwks`;
}

function getCachedLocalId(cacheKey: string): string | null {
  const entry = workosIdCache.get(cacheKey);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    workosIdCache.delete(cacheKey);
    return null;
  }

  return entry.localId;
}

function setCachedLocalId(cacheKey: string, localId: string) {
  if (workosIdCache.size >= WORKOS_ID_CACHE_MAX_SIZE) {
    const oldestKey = workosIdCache.keys().next().value;
    if (oldestKey !== undefined) {
      workosIdCache.delete(oldestKey);
    }
  }

  workosIdCache.set(cacheKey, {
    localId,
    expiresAt: Date.now() + WORKOS_ID_CACHE_TTL_MS,
  });
}

async function resolveLocalUserId(
  db: ReturnType<typeof createDb>,
  workosUserId: string,
  apiKey: string | undefined
): Promise<string | null> {
  const cacheKey = `user:${workosUserId}`;
  const cached = getCachedLocalId(cacheKey);
  if (cached) {
    return cached;
  }

  let user = await db.query.users.findFirst({
    where: eq(users.workosUserId, workosUserId),
    columns: { id: true },
  });

  if (!user) {
    user = await db.query.users.findFirst({
      where: eq(users.id, workosUserId),
      columns: { id: true },
    });
  }

  if (!user) {
    // Standalone Connect stores our local ID as the WorkOS external_id without
    // necessarily populating users.workosUserId. Resolve that server-side link;
    // never infer identity from an email or an untrusted token claim.
    if (!apiKey) {
      throw new Error("WorkOS API key is required to resolve OAuth subjects");
    }
    const remote = await new WorkOS(apiKey).userManagement
      .getUser(workosUserId)
      .catch((error: unknown) => {
        if (error instanceof NotFoundException) {
          return null;
        }
        throw error;
      });
    if (!remote?.externalId) {
      return null;
    }
    user = await db.query.users.findFirst({
      where: eq(users.id, remote.externalId),
      columns: { id: true },
    });
    if (!user) {
      return null;
    }
  }

  setCachedLocalId(cacheKey, user.id);
  return user.id;
}

async function resolveLocalOrganizationId(
  db: ReturnType<typeof createDb>,
  workosOrgId: string
): Promise<string | null> {
  const cacheKey = `org:${workosOrgId}`;
  const cached = getCachedLocalId(cacheKey);
  if (cached) {
    return cached;
  }

  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.workosOrgId, workosOrgId),
    columns: { id: true },
  });

  if (!organization) {
    return null;
  }

  setCachedLocalId(cacheKey, organization.id);
  return organization.id;
}

/** Callers must handle a missing `aud` claim before calling this. */
function isAllowedAudience(
  aud: NonNullable<JWTPayload["aud"]>,
  workosClientId: string | undefined
) {
  const allowed = new Set<string>(OAUTH_AUDIENCES);
  if (workosClientId) {
    allowed.add(workosClientId);
  }

  const audiences = Array.isArray(aud) ? aud : [aud];
  return audiences.some((audience) => allowed.has(audience));
}

function getRemoteJwks(jwksUrl: string): ReturnType<typeof createRemoteJWKSet> {
  const cached = remoteJwksByUrl.get(jwksUrl);
  if (cached) {
    return cached;
  }

  const jwks = createRemoteJWKSet(new URL(jwksUrl), {
    cacheMaxAge: 10 * 60 * 1000,
    cooldownDuration: 30_000,
  });
  remoteJwksByUrl.set(jwksUrl, jwks);
  return jwks;
}

function decodeJsonSegment(segment: string): unknown {
  try {
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return undefined;
  }
}

function looksLikeJwt(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [headerSegment, payloadSegment] = parts as [string, string, string];
  const header = decodeJsonSegment(headerSegment);
  const payload = decodeJsonSegment(payloadSegment);
  return (
    typeof header === "object" &&
    header !== null &&
    typeof payload === "object" &&
    payload !== null
  );
}

function normalizeScopeValue(rawScopes: unknown): string[] | null {
  if (typeof rawScopes === "string") {
    return rawScopes.split(SCOPE_SEPARATOR_REGEX).filter(Boolean);
  }
  if (Array.isArray(rawScopes)) {
    return rawScopes.filter(
      (scope): scope is string => typeof scope === "string" && scope.length > 0
    );
  }
  return null;
}

function extractScopes(payload: JWTPayload): string[] | null {
  const scopeClaim = normalizeScopeValue(
    payload.scope ?? payload.scp ?? payload.scopes
  );
  const permissionsClaim = normalizeScopeValue(payload.permissions);

  if (scopeClaim === null && permissionsClaim === null) {
    return null;
  }

  return [...new Set([...(scopeClaim ?? []), ...(permissionsClaim ?? [])])];
}

function hasRequiredScope(scopes: string[], requiredScope?: string) {
  if (!requiredScope) {
    return true;
  }

  if (scopes.includes(requiredScope) || scopes.includes("*")) {
    return true;
  }

  if (scopes.includes(LEGACY_API_WRITE_SCOPE)) {
    return true;
  }

  return (
    requiredScope.endsWith(".read") && scopes.includes(LEGACY_API_READ_SCOPE)
  );
}

async function verifyOAuthToken(
  c: Context,
  token: string,
  requiredScope?: string
): Promise<AuthResult> {
  try {
    const { payload } = await jwtVerify(
      token,
      getRemoteJwks(getOAuthJwksUrl(c)),
      {
        issuer: getOAuthIssuer(c),
      }
    );

    if (payload.aud === undefined) {
      return { success: false, error: "Missing token audience", status: 401 };
    }
    if (!isAllowedAudience(payload.aud, c.env.WORKOS_CLIENT_ID)) {
      return { success: false, error: "Invalid token audience", status: 401 };
    }

    const grant = readOAuthConsentGrant(payload);
    if (grant === null) {
      return {
        success: false,
        error: "Invalid OAuth consent grant",
        status: 401,
      };
    }
    const scopes = grant?.scopes ?? extractScopes(payload) ?? [];
    const workosOrgId = payload.org_id;

    if (!payload.sub) {
      return { success: false, error: "Missing OAuth subject", status: 401 };
    }

    if (
      !grant &&
      !(typeof workosOrgId === "string" && workosOrgId.length > 0)
    ) {
      return {
        success: false,
        error: "Missing OAuth organization",
        status: 401,
      };
    }

    if (!hasRequiredScope(scopes, requiredScope)) {
      return { success: false, error: "Forbidden", status: 403 };
    }

    const db = c.get("db");
    const [localUserId, localOrgId] = await Promise.all([
      resolveLocalUserId(db, payload.sub, c.env.WORKOS_API_KEY),
      grant?.organizationSource === "local"
        ? Promise.resolve(grant.organizationId)
        : resolveLocalOrganizationId(
            db,
            typeof workosOrgId === "string" ? workosOrgId : ""
          ),
    ]);

    if (!localUserId) {
      return {
        success: false,
        error: "No local user found for OAuth subject",
        status: 401,
      };
    }

    if (!localOrgId) {
      return {
        success: false,
        error: "No local organization found for OAuth token",
        status: 401,
      };
    }

    const membership = await db.query.members.findFirst({
      where: and(
        eq(members.userId, localUserId),
        eq(members.organizationId, localOrgId)
      ),
      columns: { id: true },
    });
    if (!membership) {
      return { success: false, error: "Workspace access revoked", status: 403 };
    }

    return {
      success: true,
      auth: {
        type: "oauth",
        keyId: `oauth:${localUserId}:${localOrgId}`,
        userId: localUserId,
        scopes,
        identity: { externalId: localOrgId },
      },
    };
  } catch (error) {
    if (error instanceof joseErrors.JOSEError) {
      return { success: false, error: error.code, status: 401 };
    }

    return {
      success: false,
      error: "OAuth verification unavailable",
      status: 503,
    };
  }
}

function getRecovery(status: AuthFailureStatus) {
  if (status === 401) {
    return `Send Authorization: Bearer <NOTRA_API_KEY>. See ${AUTH_GUIDE_URL} for agent credential discovery.`;
  }

  if (status === 403) {
    return "Request a key with the required scope for this endpoint, then retry after verifying whether the previous mutation completed.";
  }

  if (status === 429) {
    return "This key has exhausted its rate limit or credit allowance. Wait for the limit to reset, or use a key with more capacity.";
  }

  return "The authentication service is temporarily unavailable. Retry with exponential backoff.";
}

function getRequestedOrganizationId(c: Context): string | null {
  for (const header of ACCOUNT_ORG_HEADERS) {
    const value = c.req.header(header)?.trim();
    if (value) {
      return value;
    }
  }
  return null;
}

async function resolveAccountKeyAuth(
  c: Context,
  verified: V2KeysVerifyKeyResponseData & { identity: Identity },
  userId: string
): Promise<AuthResult> {
  const db = c.get("db");
  const membershipRows = await db.query.members.findMany({
    where: eq(members.userId, userId),
    columns: { organizationId: true },
    orderBy: [asc(members.createdAt), asc(members.organizationId)],
  });
  const memberOrgIds = [
    ...new Set(
      membershipRows
        .map((row) => row.organizationId)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    ),
  ];

  if (memberOrgIds.length === 0) {
    return {
      success: false,
      error: "Workspace access revoked",
      status: 403,
      kind: API_AUTH_KINDS.UNKEY,
    };
  }

  const requestedOrgId = getRequestedOrganizationId(c);
  const verifiedIdentity = verified.identity;
  if (requestedOrgId) {
    if (!memberOrgIds.includes(requestedOrgId)) {
      return {
        success: false,
        error: "Workspace access revoked",
        status: 403,
        kind: API_AUTH_KINDS.UNKEY,
      };
    }
    const auth: AccountApiKeyAuthData = {
      ...verified,
      userId,
      isAccountKey: true,
      identity: { ...verifiedIdentity, externalId: requestedOrgId },
    };
    c.set("auth", auth);
    return { success: true, auth };
  }

  const pathname = c.req.path;
  if (isUnscopedApiPath(pathname) || memberOrgIds.length === 1) {
    const [fallbackOrgId] = memberOrgIds as [string, ...string[]];
    const auth: AccountApiKeyAuthData = {
      ...verified,
      userId,
      isAccountKey: true,
      identity: { ...verifiedIdentity, externalId: fallbackOrgId },
    };
    c.set("auth", auth);
    return { success: true, auth };
  }

  return {
    success: false,
    error:
      "Organization selection required: send X-Notra-Organization-Id for the workspace this request should act on",
    status: 403,
    kind: API_AUTH_KINDS.UNKEY,
  };
}

async function verifyRequestAuth(
  c: Context,
  options: AuthOptions = {}
): Promise<AuthResult> {
  const getKey = options.getKey ?? extractBearerToken;
  const apiKey = getKey(c);

  if (!apiKey) {
    return { success: false, error: "Missing API key", status: 401 };
  }

  if (isFeedbackToken(apiKey)) {
    const tokenResult = await verifyFeedbackToken(
      c,
      apiKey,
      options.permissions
    );
    if (!tokenResult.success) {
      return { ...tokenResult, kind: API_AUTH_KINDS.FEEDBACK_TOKEN };
    }
    const { identity } = tokenResult;
    const auth: AuthData = {
      type: "ingest",
      keyId: `feedback:${identity.organizationId}:${identity.projectId ?? "-"}`,
      scopes: ["feedback.write"],
      projectId: identity.projectId,
      identity: { externalId: identity.organizationId },
    };
    c.set("auth", auth);
    return { success: true, auth };
  }

  if (looksLikeJwt(apiKey)) {
    const oauthResult = await verifyOAuthToken(c, apiKey, options.permissions);
    if (oauthResult.success) {
      c.set("auth", oauthResult.auth);
      return oauthResult;
    }
    return { ...oauthResult, kind: API_AUTH_KINDS.OAUTH };
  }

  try {
    const unkey = new Unkey({ rootKey: c.env.UNKEY_ROOT_KEY });
    const permissionsToTry = [
      options.permissions,
      ...(options.legacyPermissions ?? []),
    ].filter(
      (permission, index, permissions): permission is string =>
        typeof permission === "string" &&
        permission.length > 0 &&
        permissions.indexOf(permission) === index
    );
    let result = await unkey.keys.verifyKey({
      key: apiKey,
      ...(permissionsToTry[0] ? { permissions: permissionsToTry[0] } : {}),
    });

    for (const permission of permissionsToTry.slice(1)) {
      if (
        result.data.valid ||
        result.data.code !== "INSUFFICIENT_PERMISSIONS"
      ) {
        break;
      }

      result = await unkey.keys.verifyKey({
        key: apiKey,
        permissions: permission,
      });
    }

    if (!result.data.valid) {
      const failure =
        UNKEY_AUTH_FAILURES[result.data.code] ?? DEFAULT_UNKEY_AUTH_FAILURE;
      return {
        success: false,
        error: failure.error,
        status: failure.status,
        kind: API_AUTH_KINDS.UNKEY,
        code: result.data.code,
      };
    }

    const verifiedIdentity = result.data.identity;
    if (!verifiedIdentity?.externalId) {
      return {
        success: false,
        error: "Missing or invalid API key",
        status: 401,
        kind: API_AUTH_KINDS.UNKEY,
      };
    }

    const accountUserId = parseAccountUserId(verifiedIdentity.externalId);
    if (accountUserId) {
      try {
        return await resolveAccountKeyAuth(
          c,
          { ...result.data, identity: verifiedIdentity },
          accountUserId
        );
      } catch {
        return {
          success: false,
          error: "Service unavailable",
          status: 503,
          kind: API_AUTH_KINDS.UNKEY,
        };
      }
    }

    c.set("auth", result.data);
    return { success: true, auth: result.data };
  } catch {
    return {
      success: false,
      error: "Service unavailable",
      status: 503,
      kind: API_AUTH_KINDS.UNKEY,
    };
  }
}

export function authMiddleware(options: AuthOptions = {}) {
  return async (c: Context, next: Next) => {
    const authResult = await verifyRequestAuth(c, options);
    if (!authResult.success) {
      trackApiKeyRejected(c, {
        authKind: authResult.kind,
        status: authResult.status,
        reason: authResult.error,
        unkeyCode: authResult.code,
      });
      if (authResult.status === 401) {
        c.header(
          "WWW-Authenticate",
          `Bearer resource_metadata="${RESOURCE_METADATA_URL}"`
        );
      }

      return c.json(
        {
          error: authResult.error,
          code: authResult.error.toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
          recovery: getRecovery(authResult.status),
        },
        authResult.status
      );
    }

    trackApiKeyVerified(c, authResult.auth);
    await next();
  };
}
