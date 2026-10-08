import {
  SITE_CLOUDFLARE_PROVIDER_PATTERN,
  SITE_DOMAIN_CONNECT_OUTCOMES,
  SITE_DOMAIN_URL_SCHEME_PATTERN,
} from "@/constants/sites";
import type {
  SiteDomain,
  SiteDomainChipStatus,
  SiteDomainConnectOutcome,
  SiteDomainKind,
  SiteMounts,
} from "@/types/sites";
import { mountedPaths } from "@/utils/site-proxy-recipes";

export function siteDomainChipStatus(domain: SiteDomain): SiteDomainChipStatus {
  if (domain.status === "pending") {
    return domain.kind === "proxy" ? "proxyRequired" : "dnsRequired";
  }
  return domain.status;
}

export function siteDomainUrl(domain: SiteDomain, mounts: SiteMounts): string {
  const firstPath = mountedPaths(mounts)[0];
  const path = domain.kind === "proxy" && firstPath !== "/" ? firstPath : "";
  return `https://${domain.hostname}${path ?? ""}`;
}

export function parseSiteDomainConnectOutcome(
  value: string | null
): SiteDomainConnectOutcome | null {
  return (
    SITE_DOMAIN_CONNECT_OUTCOMES.find((outcome) => outcome === value) ?? null
  );
}

export function detectSiteDomainKind(value: string): SiteDomainKind | null {
  const [host = "", ...path] = value
    .trim()
    .replace(SITE_DOMAIN_URL_SCHEME_PATTERN, "")
    .split("/");
  const labels = host.split(".").filter(Boolean);
  if (labels.length < 2) {
    return null;
  }
  if (path.some(Boolean) || labels.length === 2) {
    return "proxy";
  }
  return "subdomain";
}

export function siteDnsProviderDashboardUrl(
  providerName: string | undefined,
  zone: string | undefined
): string | null {
  if (!(providerName && zone)) {
    return null;
  }
  if (SITE_CLOUDFLARE_PROVIDER_PATTERN.test(providerName)) {
    return `https://dash.cloudflare.com/?to=/:account/${encodeURIComponent(zone)}/dns/records`;
  }
  return null;
}
