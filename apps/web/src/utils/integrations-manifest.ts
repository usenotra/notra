import type {
  IntegrationsManifest,
  IntegrationsManifestAuthEntry,
  IntegrationsManifestBasis,
  IntegrationsManifestMechanics,
} from "@/types/integrations-manifest";
import { apiUrl, siteUrl } from "@/utils/agent-metadata";
import {
  API_URL,
  APP_URL,
  DOCS_URL,
  MCP_PROTECTED_RESOURCE_METADATA_URL,
  MCP_URL,
} from "@/utils/urls";

const INTEGRATIONS_MANIFEST_PATH = "/.well-known/integrations.json";

const API_KEY_CREDENTIAL_ID = "notra_api_key";
const OAUTH_CREDENTIAL_ID = "notra_oauth";

const BEARER_HEADER_MECHANICS: IntegrationsManifestMechanics = {
  source: "http",
  in: "header",
  headerName: "Authorization",
  scheme: "Bearer",
};

const WELL_KNOWN_MECHANICS: IntegrationsManifestMechanics = {
  source: "well-known",
};

const CLI_OAUTH_MECHANICS: IntegrationsManifestMechanics = {
  source: "cli",
  command: "notra auth login",
};

const CLI_API_KEY_MECHANICS: IntegrationsManifestMechanics = {
  source: "cli",
  command: "notra init",
  env: ["NOTRA_API_KEY"],
};

function buildBasis(): IntegrationsManifestBasis {
  return {
    via: "declared",
    source: siteUrl(INTEGRATIONS_MANIFEST_PATH),
  };
}

function buildAuthEntry(
  id: string,
  mechanics: IntegrationsManifestMechanics
): IntegrationsManifestAuthEntry {
  return {
    use: [{ id, mechanics }],
    basis: buildBasis(),
  };
}

export function buildIntegrationsManifest(): IntegrationsManifest {
  const basis = buildBasis();

  return {
    version: 3,
    summary:
      "Notra exposes an HTTP API, a hosted MCP server, and a CLI for tracking AI visibility, comparing competitors, analyzing AI traffic, and turning content gaps into articles in a saved brand voice.",
    credentials: {
      [API_KEY_CREDENTIAL_ID]: {
        type: "api_key",
        label: "Notra API key",
        generateUrl: APP_URL,
        setup:
          "Open Developer, then API Keys, in the Notra dashboard and create a key scoped to the resources you need. Store it as NOTRA_API_KEY and send it as an Authorization bearer token.",
      },
      [OAUTH_CREDENTIAL_ID]: {
        type: "oauth2",
        label: "Notra OAuth 2.1",
        setup: `Read the protected resource metadata at ${MCP_PROTECTED_RESOURCE_METADATA_URL} to find the authorization server, register a client at https://oauth.usenotra.com/oauth2/register, and run the authorization code flow with PKCE. Request least privilege scopes such as projects.read and visibility.read and include offline_access when you need a refresh token. Headless clients can use the device authorization grant instead, which is what notra auth login does. Send the access token as an Authorization bearer token.`,
      },
    },
    surfaces: [
      {
        slug: "notra-api",
        name: "Notra API",
        type: "http",
        docs: `${DOCS_URL}/api/getting-started`,
        spec: apiUrl("/openapi.json"),
        url: API_URL,
        basis,
        auth: {
          status: "required",
          entries: [
            buildAuthEntry(API_KEY_CREDENTIAL_ID, BEARER_HEADER_MECHANICS),
            buildAuthEntry(OAUTH_CREDENTIAL_ID, WELL_KNOWN_MECHANICS),
          ],
        },
      },
      {
        slug: "notra-mcp-server",
        name: "Notra MCP server",
        type: "mcp",
        docs: `${DOCS_URL}/devtools/mcp`,
        url: MCP_URL,
        transports: ["streamable-http"],
        basis,
        auth: {
          status: "required",
          entries: [
            buildAuthEntry(OAUTH_CREDENTIAL_ID, WELL_KNOWN_MECHANICS),
            buildAuthEntry(API_KEY_CREDENTIAL_ID, BEARER_HEADER_MECHANICS),
          ],
        },
      },
      {
        slug: "notra-cli",
        name: "Notra CLI",
        type: "cli",
        docs: `${DOCS_URL}/devtools/cli`,
        command: "notra",
        packages: [
          {
            registryType: "npm",
            identifier: "notra",
            runtimeHint: "npx",
          },
        ],
        basis,
        auth: {
          status: "required",
          entries: [
            buildAuthEntry(OAUTH_CREDENTIAL_ID, CLI_OAUTH_MECHANICS),
            buildAuthEntry(API_KEY_CREDENTIAL_ID, CLI_API_KEY_MECHANICS),
          ],
        },
      },
    ],
  };
}
