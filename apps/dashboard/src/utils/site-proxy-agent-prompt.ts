import type { SiteMounts } from "@/types/sites";
import { mountedPaths } from "@/utils/site-proxy-recipes";

export function buildSiteProxyAgentPrompt(
  hostname: string,
  aliasOrigin: string,
  mounts: SiteMounts
): string {
  const origin = aliasOrigin.replace(/\/+$/, "");
  const paths = mountedPaths(mounts);
  return [
    `Set up ${hostname} to reverse-proxy Notra from the fixed upstream ${origin} for these enabled mounts: ${paths.join(", ")}. Keep the public URL on ${hostname}.`,
    "Inspect the existing framework, hosting platform, routes and authentication first. Detect the platform; do not assume Vercel. Use and merge its native proxy/rewrite configuration.",
    "Match only each enabled mount itself and its descendants, not similarly prefixed paths. Preserve the exact mount prefix, full child path and query string when forwarding to the fixed upstream.",
    "Preserve unrelated routes and local authentication. Do not forward Cookie, Authorization or other credentials to Notra; do not add secrets to the configuration.",
    "Use a reverse proxy, not browser redirects. Never accept a request-controlled upstream or create an open proxy. Do not change DNS, provider settings or deploy without explicit approval.",
    "Validate native configuration and test exact mounts, children, query strings, unrelated routes and existing auth. Inspect actual rendered pages to verify CSS/JS assets, feeds and sitemaps use the correct mounted paths; report the changes and test results.",
  ].join("\n");
}
