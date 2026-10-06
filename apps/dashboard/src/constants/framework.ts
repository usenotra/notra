export const DASHBOARD_SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-DNS-Prefetch-Control": "on",
};

/**
 * Routes that need longer than the project's default function timeout (600 s).
 * Nitro builds a full copy of the server for every rule, so shorter caps are
 * left to the default rather than costing a copy each.
 */
export const DASHBOARD_FUNCTION_RULES = {
  "/api/organizations/*/chat": { maxDuration: 1800 },
  "/api/organizations/*/dashboard-agent/chat": { maxDuration: 1800 },
  "/api/organizations/*/agent/**": { maxDuration: 800 },
};

/** Quiet period after a dev workflow build before its esbuild service is stopped. */
export const WORKFLOW_ESBUILD_IDLE_STOP_MS = 5000;

export const SOURCE_MAPPING_URL_COMMENT = /\/\/# sourceMappingURL=\S+\s*$/;

export const ORGANIZATION_COOKIE_SLUG_PATTERN = /^[a-z0-9-]+$/;

/**
 * Packages only server code imports. The client's dependency scan starts at
 * the router and follows route loaders into server-function handlers, which
 * the Start compiler strips from the browser build, so without this list the
 * dev server pre-bundles these SDKs for the browser on every cold start. A
 * server package missing here is only bundled needlessly; never list one the
 * browser imports (it would be served unbundled).
 */
export const SERVER_ONLY_PACKAGES = [
  "@ai-sdk/anthropic",
  "@ai-sdk/code-mode",
  "@ai-sdk/devtools",
  "@ai-sdk/google",
  "@ai-sdk/mcp",
  "@ai-sdk/openai",
  "@ai-sdk/perplexity",
  "@aws-sdk/client-s3",
  "@aws-sdk/s3-request-presigner",
  "@cursor/sdk",
  "@linear/sdk",
  "@mdx-js/mdx",
  "@modelcontextprotocol/sdk",
  "@noble/hashes",
  "@octokit/core",
  "@openrouter/ai-sdk-provider",
  "@resvg/resvg-js",
  "@supermemory/tools",
  "@tinybirdco/sdk",
  "@unkey/api",
  "@upstash/box",
  "@upstash/qstash",
  "@upstash/ratelimit",
  "@upstash/redis",
  "@vercel/functions",
  "@workos-inc/node",
  "@workos/authkit-session",
  "dedent",
  "eve",
  "free-email-domains-list",
  "hast-util-from-html",
  "ipaddr.js",
  "libheif-js",
  "mailchecker",
  "nitro",
  "pg",
  "post-for-me",
  "posthog-node",
  "react-email",
  "resend",
  "sanitize-html",
  "satori",
  "satori-html",
  "sharp",
  "undici",
  "workflow",
];
