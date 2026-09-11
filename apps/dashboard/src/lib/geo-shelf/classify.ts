import {
  isAllowedShelfUrl,
  shelfDomainFromUrl,
} from "@notra/schemas/utils/dashboard/shelf-url";

import {
  GEO_SHELF_DOCS_HOSTNAME_PREFIX,
  GEO_SHELF_KIND_BY_DOMAIN,
} from "@/constants/geo-shelf";

import type {
  GeoShelfOwnership,
  GeoShelfSourceKind,
} from "../../types/geo-shelf";

function hostnameFromDomain(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const asUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  if (isAllowedShelfUrl(asUrl)) {
    return shelfDomainFromUrl(asUrl);
  }
  return null;
}

function isSameHostOrSubdomain(left: string, right: string): boolean {
  return (
    left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`)
  );
}

export function shelfKindFromDomain(domain: string): GeoShelfSourceKind {
  const mapped = GEO_SHELF_KIND_BY_DOMAIN[domain];
  if (mapped) {
    return mapped;
  }
  for (const [host, kind] of Object.entries(GEO_SHELF_KIND_BY_DOMAIN)) {
    if (domain === host || domain.endsWith(`.${host}`)) {
      return kind;
    }
  }
  if (domain.startsWith(GEO_SHELF_DOCS_HOSTNAME_PREFIX)) {
    return "docs";
  }
  return "other";
}

export function shelfOwnershipFromDomain(
  domain: string,
  ownDomain: string | null,
  competitorDomains: readonly (string | null)[]
): GeoShelfOwnership {
  const ownHost = hostnameFromDomain(ownDomain);
  if (ownHost && isSameHostOrSubdomain(domain, ownHost)) {
    return "own";
  }
  for (const competitorDomain of competitorDomains) {
    const competitorHost = hostnameFromDomain(competitorDomain);
    if (competitorHost && isSameHostOrSubdomain(domain, competitorHost)) {
      return "competitor";
    }
  }
  return "third_party";
}
