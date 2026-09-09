import { markdownResponse } from "@/utils/http";

const AUTH_MD = `# Notra Agent Authentication

Notra exposes an authenticated API and MCP server for agents that track AI visibility, manage GEO projects and prompts, analyze competitors and AI traffic, and create content in a saved brand voice. Use this guide to discover the supported auth metadata, request an OAuth or API-key credential, and recover from common errors.

## Discover

Start at \`/.well-known/agent.json\`, \`/.well-known/agent-card.json\`, and \`/.well-known/api-catalog\`. The API resource server is \`https://api.usenotra.com\`, and its protected resource metadata is published at \`https://api.usenotra.com/.well-known/oauth-protected-resource\`. The MCP resource server is \`https://mcp.usenotra.com\`, and its protected resource metadata is published at \`https://mcp.usenotra.com/.well-known/oauth-protected-resource\`. Unauthenticated API and MCP requests return a \`WWW-Authenticate\` header with a \`resource_metadata\` url.

## Pick a method

OAuth-capable clients should follow the authorization server advertised by the protected resource metadata. The production authorization server is \`https://oauth.usenotra.com\`, with standard endpoints at \`/oauth2/authorize\`, \`/oauth2/token\`, \`/oauth2/register\`, and \`/oauth2/revoke\`, and signing keys at \`/oauth2/jwks\`. Manual clients can use API keys created in the Notra dashboard.

## Register

Call \`POST https://oauth.usenotra.com/oauth2/register\` for dynamic OAuth client registration, or identify with a Client ID Metadata Document if your client supports it. Agents should request the least privileged resource scopes, such as \`projects.read\`, \`prompts.read\`, \`scans.read\`, \`scans.write\`, \`visibility.read\`, \`briefs.read\`, and \`traffic.read\`. Request both \`scans.write\` to start a scan and \`scans.read\` to poll its status and read results. GEO tools also require a plan that includes GEO. Include \`offline_access\` when a refresh token is needed.

## Authorize

Use the authorization code flow with PKCE (\`S256\`). Headless clients without a redirect target can use the device authorization grant at \`https://oauth.usenotra.com/oauth2/device_authorization\`, then poll \`/oauth2/token\` with the returned device code while the user approves in a browser.

## Use the credential

Send the credential as \`Authorization: Bearer <TOKEN>\`. For MCP clients that support OAuth discovery, start at \`https://mcp.usenotra.com/.well-known/oauth-protected-resource\`; for manual clients, use a Notra API key as the bearer credential when connecting to \`https://mcp.usenotra.com/mcp\`.

## Errors

401 responses include \`WWW-Authenticate: Bearer resource_metadata="https://api.usenotra.com/.well-known/oauth-protected-resource"\`. Error bodies keep the backward-compatible \`error\` string and may include sibling \`code\` and \`recovery\` fields. If a request is rate limited, respect \`Retry-After\`.

## Revocation

Call \`POST https://oauth.usenotra.com/oauth2/revoke\` for OAuth tokens, or revoke API keys in the Notra dashboard. Agents should discard revoked credentials immediately and repeat discovery before requesting a replacement.
`;

export function GET() {
  return markdownResponse(AUTH_MD);
}
