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

export const STATIC_PAGE_CACHE_CONTROL =
  "public, max-age=0, s-maxage=31536000, stale-while-revalidate=86400";

export const DYNAMIC_PAGE_CACHE_CONTROL =
  "private, no-cache, no-store, max-age=0, must-revalidate";
