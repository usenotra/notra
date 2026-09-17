import {
  API_SCOPE_RESOURCES,
  API_READ_SCOPES,
  API_WRITE_SCOPES,
  API_GRANULAR_SCOPES,
  getApiScopeId,
} from "./api-scopes";
import {
  OAUTH_ACCESS_CLAIM,
  OAUTH_PERMISSION_CLAIM_PREFIX,
  OAUTH_WORKSPACE_CLAIM,
} from "./constants/oauth-consent";
import type {
  OAuthConsentGrant,
  OAuthConsentOption,
  OAuthConsentWorkspace,
} from "./types/oauth-consent";

export function buildOAuthConsentOptions(
  workspaces: readonly OAuthConsentWorkspace[]
): OAuthConsentOption[] {
  return [
    {
      claim: OAUTH_WORKSPACE_CLAIM,
      type: "enum",
      label: "Workspace",
      choices: workspaces.map(({ id, name }) => ({ value: id, label: name })),
    },
    {
      claim: OAUTH_ACCESS_CLAIM,
      type: "enum",
      label: "Permissions",
      choices: [
        { value: "read", label: "Read only" },
        { value: "write", label: "Write only" },
        { value: "full", label: "Full access (read and write)" },
      ],
    },
  ];
}

export function readOAuthConsentGrant(
  payload: Record<string, unknown>
): OAuthConsentGrant | null | undefined {
  const organizationId = payload[OAUTH_WORKSPACE_CLAIM];
  const accessLevel = payload[OAUTH_ACCESS_CLAIM];
  const hasConsentClaims =
    accessLevel !== undefined ||
    Object.keys(payload).some((key) =>
      key.startsWith(OAUTH_PERMISSION_CLAIM_PREFIX)
    );
  if (organizationId === undefined && !hasConsentClaims) {
    return undefined;
  }
  if (typeof organizationId !== "string" || !organizationId.trim()) {
    return null;
  }

  if (accessLevel !== undefined) {
    switch (accessLevel) {
      case "read":
        return { organizationId, scopes: [...API_READ_SCOPES] };
      case "write":
        return { organizationId, scopes: [...API_WRITE_SCOPES] };
      case "full":
        return { organizationId, scopes: [...API_GRANULAR_SCOPES] };
      default:
        return null;
    }
  }

  const scopes: OAuthConsentGrant["scopes"] = [];
  for (const { id } of API_SCOPE_RESOURCES) {
    const access = payload[`${OAUTH_PERMISSION_CLAIM_PREFIX}${id}`];
    if (access === undefined || access === "none") {
      continue;
    }
    if (access !== "read" && access !== "write") {
      return null;
    }
    scopes.push(getApiScopeId(id, "read"));
    if (access === "write") {
      scopes.push(getApiScopeId(id, "write"));
    }
  }
  return { organizationId, scopes };
}
