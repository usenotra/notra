import type { V2KeysVerifyKeyResponseData } from "@unkey/api/models/components";

type ApiKeyAuthData = V2KeysVerifyKeyResponseData;

export interface OAuthAuthData {
  type: "oauth";
  keyId: string;
  userId: string;
  scopes: string[];
  identity: {
    externalId: string;
  };
}

export interface IngestAuthData {
  type: "ingest";
  keyId: string;
  scopes: string[];
  projectId: string | null;
  identity: {
    externalId: string;
  };
}

export interface AccountApiKeyAuthData extends V2KeysVerifyKeyResponseData {
  userId: string;
  isAccountKey: true;
}

export type WorkspaceAuthData =
  | ApiKeyAuthData
  | AccountApiKeyAuthData
  | OAuthAuthData;
export type AuthData = WorkspaceAuthData | IngestAuthData;

export function getOrganizationIdFromAuth(auth: AuthData): string | null {
  return auth.identity?.externalId ?? null;
}

export function isIngestAuth(auth: AuthData): auth is IngestAuthData {
  return "type" in auth && auth.type === "ingest";
}

const ACCOUNT_KEY_EXTERNAL_ID_PREFIX = "user:";

export const ACCOUNT_ORG_HEADERS = [
  "x-notra-organization-id",
  "x-organization-id",
] as const;

export function parseAccountUserId(externalId: string | null | undefined) {
  if (!externalId?.startsWith(ACCOUNT_KEY_EXTERNAL_ID_PREFIX)) {
    return null;
  }
  const userId = externalId.slice(ACCOUNT_KEY_EXTERNAL_ID_PREFIX.length);
  return userId.length > 0 ? userId : null;
}

export function isAccountKeyAuth(
  auth: AuthData
): auth is AccountApiKeyAuthData {
  return (
    "isAccountKey" in auth &&
    (auth as AccountApiKeyAuthData).isAccountKey === true
  );
}

export function isOAuthAuth(auth: AuthData): auth is OAuthAuthData {
  return "type" in auth && auth.type === "oauth";
}
