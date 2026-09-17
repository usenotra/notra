// Connect's dynamically registered clients accept OIDC scopes only. API
// permissions are explicit user consent choices, signed into the access token.
export const CONNECT_OAUTH_SCOPES = ["openid", "offline_access"] as const;
export const OAUTH_WORKSPACE_CLAIM = "urn:notra:workspace";
export const OAUTH_PERMISSION_CLAIM_PREFIX = "urn:notra:permission:";
