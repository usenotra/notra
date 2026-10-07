export const SMOKE_HELP = `Usage:
  bun geo:smoke [options] <organization-id> <project-id> "<prompt>" [model-id]
  bun geo:smoke --scan-id <id> [options] <organization-id> <project-id>
  bun geo:smoke --fixture [options]

Starting a scan calls billable models. No arguments prints this help.

Options:
  --url <url>              GEO_RUNNER_URL or http://127.0.0.1:3000 by default
  --prod                   Use GEO_RUNNER_PROD_URL and GEO_RUNNER_PROD_SECRET
  --models <id,id>          One to five model IDs from the project catalog
  --language <language>     Answer language; defaults to English
  --no-web-search           Disable web search
  --idempotency-key <key>   Reuse this key to safely retry the same scan
  --scan-id <id>            Poll an existing scoped scan without starting one
  --timeout <seconds>       Overall HTTP/polling deadline; defaults to 300
  --json                    Write one final scan envelope to stdout
  --fixture                 Seed the local smoke fixture; loopback HTTP and DB only
  --help                    Print this help

Remote calls require GEO_RUNNER_SECRET, or GEO_RUNNER_PROD_SECRET with --prod.
Progress and the idempotency key go to stderr. Remote calls need no DATABASE_URL.
`;

export const SMOKE_FIXTURE = {
  organizationId: "geo-smoke-org",
  projectId: "geo-smoke-project",
  brandId: "geo-smoke-brand",
  settingsId: "geo-smoke-settings",
  name: "GEO Smoke Test",
  prompt: "What are the best AI content marketing tools?",
  websiteUrl: "https://www.usenotra.com",
} as const;
export const SMOKE_REQUEST_TIMEOUT_MS = 10_000;
export const SMOKE_REQUEST_ATTEMPTS = 3;
export const SMOKE_POLL_INTERVAL_MS = 1000;
