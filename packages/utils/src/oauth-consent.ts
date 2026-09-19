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
} from "./types/oauth-consent";

export function buildOAuthConsentOptions(): OAuthConsentOption[] {
  return [
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
  const localOrganizationId = payload[OAUTH_WORKSPACE_CLAIM];
  const organizationId =
    localOrganizationId === undefined ? payload.org_id : localOrganizationId;
  const organizationSource =
    localOrganizationId === undefined ? "workos" : "local";
  const accessLevel = payload[OAUTH_ACCESS_CLAIM];
  const hasConsentClaims =
    accessLevel !== undefined ||
    Object.keys(payload).some((key) =>
      key.startsWith(OAUTH_PERMISSION_CLAIM_PREFIX)
    );
  if (localOrganizationId === undefined && !hasConsentClaims) {
    return undefined;
  }
  if (typeof organizationId !== "string" || !organizationId.trim()) {
    return null;
  }

  if (accessLevel !== undefined) {
    switch (accessLevel) {
      case "read":
        return {
          organizationId,
          organizationSource,
          scopes: [...API_READ_SCOPES],
        };
      case "write":
        return {
          organizationId,
          organizationSource,
          scopes: [...API_WRITE_SCOPES],
        };
      case "full":
        return {
          organizationId,
          organizationSource,
          scopes: [...API_GRANULAR_SCOPES],
        };
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
  return { organizationId, organizationSource, scopes };
}
