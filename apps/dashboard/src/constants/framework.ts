export const DASHBOARD_SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-DNS-Prefetch-Control": "on",
};

export const DASHBOARD_FUNCTION_RULES = {
  "/api/uploads/content-image": { maxDuration: 30 },
  "/api/uploads/convert-heic": { maxDuration: 30 },
  "/api/demo/sandbox": { maxDuration: 60 },
  "/api/demo/sandbox/reset": { maxDuration: 60 },
  "/api/demo/sandbox/customize": { maxDuration: 60 },
  "/api/demo/enter": { maxDuration: 60 },
  "/api/organizations/*/dashboard-agent/chat": { maxDuration: 1800 },
  "/api/cron/monitoring": { maxDuration: 120 },
  "/api/cron/geo-scan": { maxDuration: 300 },
  "/api/organizations/*/content/*/chat": { maxDuration: 60 },
  "/api/cron/geo-content-gaps": { maxDuration: 300 },
  "/api/cron/daily-summary": { maxDuration: 60 },
  "/api/organizations/*/chat": { maxDuration: 1800 },
  "/api/command-palette/navigate": { maxDuration: 15 },
  "/api/organizations/*/agent/**": { maxDuration: 800 },
};

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
