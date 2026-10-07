export const MARKDOWN_NAMESPACE = "md";

export const DUALMARK_SKIP_PATHS = [
  "/.well-known",
  "/api",
  "/ask",
  "/apple-icon.png",
  "/demo-dark.webp",
  "/demo.webp",
  "/design.md",
  "/favicon.ico",
  "/feedback.md",
  "/icon.svg",
  "/ip-checker.md",
  "/llms-full.txt",
  "/llms.txt",
  "/logo-dark.svg",
  "/logo.svg",
  "/manifest.json",
  "/marketing",
  "/notra-mark.svg",
  "/og",
  "/og-image.png",
  "/robots.txt",
  "/rss.xml",
  "/sitemap.xml",
  "/testimonials",
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
] as const;

export const PROXY_EXCLUDED_PATH_PREFIXES = [
  "/_serverFn/",
  "/md/",
  "/api/",
  "/@",
  "/node_modules/",
  "/src/",
  "/assets/",
] as const;

export const PUBLIC_PAGE_CACHE_CONTROL =
  "public, max-age=0, s-maxage=300, stale-while-revalidate=60";

export const DYNAMIC_PAGE_CACHE_CONTROL =
  "private, no-cache, no-store, max-age=0, must-revalidate";

export const GEO_INGEST_ENDPOINT = "https://ingest.usenotra.com";

export const DOCS_PROXY_ORIGIN = "https://notra.mintlify.site";
