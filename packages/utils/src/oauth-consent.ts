import { API_SCOPE_RESOURCES, getApiScopeId } from "./api-scopes";
import {
  OAUTH_PERMISSION_CLAIM_PREFIX,
  OAUTH_WORKSPACE_CLAIM,
} from "./constants/oauth-consent";
import type {
  OAuthConsentGrant,
  OAuthConsentOption,
  OAuthConsentWorkspace,
} from "./types/oauth-consent";

/** Workspaces must come from the authenticated user's current memberships. */
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
    ...API_SCOPE_RESOURCES.map((resource): OAuthConsentOption => ({
      claim: `${OAUTH_PERMISSION_CLAIM_PREFIX}${resource.id}`,
      type: "enum",
      label: `${resource.label} access`,
      choices: [
        { value: "none", label: "None" },
        { value: "read", label: "Read" },
        { value: "write", label: "Read and write" },
      ],
    })),
  ];
}

/** Only call after verifying the JWT signature, issuer and audience.
 * Undefined means a legacy token; null means a malformed consent grant.
 */
export function readOAuthConsentGrant(
  payload: Record<string, unknown>
): OAuthConsentGrant | null | undefined {
  const organizationId = payload[OAUTH_WORKSPACE_CLAIM];
  const hasConsentClaims = Object.keys(payload).some((key) =>
    key.startsWith(OAUTH_PERMISSION_CLAIM_PREFIX)
  );
  if (organizationId === undefined && !hasConsentClaims) {
    return undefined;
  }
  if (typeof organizationId !== "string" || !organizationId.trim()) {
    return null;
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
