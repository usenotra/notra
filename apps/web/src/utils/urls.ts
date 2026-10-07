export const SITE_URL = "https://www.usenotra.com";

export const APP_URL = "https://app.usenotra.com";

export const API_URL = "https://api.usenotra.com";

export const DOCS_URL = `${SITE_URL}/docs`;

export const MCP_URL = "https://mcp.usenotra.com/mcp";

export const MCP_PROTECTED_RESOURCE_METADATA_URL =
  "https://mcp.usenotra.com/.well-known/oauth-protected-resource";

export const HOMEPAGE_LINK_HEADER = [
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  `<${DOCS_URL}>; rel="service-doc"; type="text/html"`,
].join(", ");

export const DEMO_URL = "https://demo.usenotra.com";
