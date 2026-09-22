import { CONNECT_OAUTH_SCOPES } from "@notra/utils/constants/oauth-consent";

export const API_URL = "https://api.usenotra.com";
const DEFAULT_AUTHKIT_DOMAIN = "oauth.usenotra.com";
const AUTH_SERVER_URL = `https://${DEFAULT_AUTHKIT_DOMAIN}`;
const AUTH_ISSUER_URL = AUTH_SERVER_URL;
const MCP_ORIGIN_URL = "https://mcp.usenotra.com";
const MCP_RESOURCE_URL = `${MCP_ORIGIN_URL}/mcp`;
const SUPPORTED_RESOURCE_URLS = new Set([
  API_URL,
  MCP_ORIGIN_URL,
  MCP_RESOURCE_URL,
]);
export const SITE_URL = "https://www.usenotra.com";

export const RESOURCE_METADATA_URL = `${API_URL}/.well-known/oauth-protected-resource`;
export const AUTH_GUIDE_URL = `${SITE_URL}/auth.md`;

function normalizeProtectedResource(resource: string) {
  if (resource === MCP_ORIGIN_URL) {
    return MCP_RESOURCE_URL;
  }

  return SUPPORTED_RESOURCE_URLS.has(resource) ? resource : API_URL;
}

const AGENT_AUTH_METADATA = {
  register_uri: `${AUTH_SERVER_URL}/oauth2/register`,
  claim_uri: `${SITE_URL}/agent/auth/claim`,
  revocation_uri: `${AUTH_SERVER_URL}/oauth2/revoke`,
  skill: AUTH_GUIDE_URL,
  identity_types_supported: ["anonymous", "identity_assertion"],
  anonymous: {
    credential_types_supported: ["api_key"],
  },
  identity_assertion: {
    assertion_types_supported: [
      "verified_email",
      "urn:ietf:params:oauth:token-type:id-jag",
    ],
    credential_types_supported: ["api_key", "bearer"],
  },
} as const;

export function buildProtectedResourceMetadata(resource = API_URL) {
  return {
    resource: normalizeProtectedResource(resource),
    authorization_servers: [AUTH_ISSUER_URL],
    scopes_supported: CONNECT_OAUTH_SCOPES,
    bearer_methods_supported: ["header"],
    resource_documentation: AUTH_GUIDE_URL,
  };
}

export function buildAuthorizationServerMetadata() {
  return {
    issuer: AUTH_ISSUER_URL,
    authorization_endpoint: `${AUTH_SERVER_URL}/oauth2/authorize`,
    token_endpoint: `${AUTH_SERVER_URL}/oauth2/token`,
    device_authorization_endpoint: `${AUTH_SERVER_URL}/oauth2/device_authorization`,
    registration_endpoint: `${AUTH_SERVER_URL}/oauth2/register`,
    revocation_endpoint: `${AUTH_SERVER_URL}/oauth2/revoke`,
    jwks_uri: `${AUTH_SERVER_URL}/oauth2/jwks`,
    response_types_supported: ["code"],
    grant_types_supported: [
      "authorization_code",
      "refresh_token",
      "urn:ietf:params:oauth:grant-type:device_code",
    ],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: CONNECT_OAUTH_SCOPES,
    agent_auth: AGENT_AUTH_METADATA,
  };
}
