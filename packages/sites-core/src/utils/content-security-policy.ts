import { SITE_CSP_STATIC_DIRECTIVES } from "@notra/sites-core/constants/security";
import type { SiteContentSecurityPolicyParams } from "@notra/sites-core/types/site-integrations";
import { integrationCspSources } from "@notra/sites-core/utils/integrations";

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

export function buildSiteContentSecurityPolicy(
  params: SiteContentSecurityPolicyParams
): string | null {
  if (!params.security.contentSecurityPolicy) {
    return null;
  }
  const integrations = integrationCspSources(params.integrations);
  const allowed = params.security.allowedOrigins;
  const scriptOrigins = [
    ...integrations.scriptSrc,
    ...allowed.filter((origin) => origin.startsWith("https://")),
  ];
  const scriptSrc = [
    "'self'",
    ...sortedUnique(params.scriptHashes).map((hash) => `'sha256-${hash}'`),
    ...sortedUnique(scriptOrigins),
  ];
  const connectSrc = [
    "'self'",
    ...sortedUnique([...integrations.connectSrc, ...allowed]),
  ];
  return [
    `script-src ${scriptSrc.join(" ")}`,
    `connect-src ${connectSrc.join(" ")}`,
    ...SITE_CSP_STATIC_DIRECTIVES,
  ].join("; ");
}
