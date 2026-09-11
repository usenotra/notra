import { lookup } from "node:dns/promises";
import { BlockList } from "node:net";

import { fetchWebpage } from "@notra/ai/utils/context-dev";
import { GEO_SHELF_TITLE_MAX_LENGTH } from "@notra/schemas/constants/dashboard/geo-shelf";
import {
  canonicalizeShelfUrl,
  shelfDomainFromUrl,
  shelfFetchUrl,
} from "@notra/schemas/utils/dashboard/shelf-url";

import {
  GEO_SHELF_BLOCKED_IPV4_SUBNETS,
  GEO_SHELF_BLOCKED_IPV6_SUBNETS,
  GEO_SHELF_PREVIEW_CACHE_MS,
  GEO_SHELF_PREVIEW_TIMEOUT_MS,
} from "@/constants/geo-shelf";

import type { GeoShelfPreview } from "../../types/geo-shelf";

const WHITESPACE_RUN = /\s+/g;

const BLOCKED_IPV4_ADDRESSES = new BlockList();
const BLOCKED_IPV6_ADDRESSES = new BlockList();
for (const [network, prefix] of GEO_SHELF_BLOCKED_IPV4_SUBNETS) {
  BLOCKED_IPV4_ADDRESSES.addSubnet(network, prefix, "ipv4");
  // The RFC 6052 well-known NAT64 prefix embeds IPv4 in its final 32 bits.
  BLOCKED_IPV6_ADDRESSES.addSubnet(`64:ff9b::${network}`, 96 + prefix, "ipv6");
}
for (const [network, prefix] of GEO_SHELF_BLOCKED_IPV6_SUBNETS) {
  BLOCKED_IPV6_ADDRESSES.addSubnet(network, prefix, "ipv6");
}

export function isPublicShelfAddress(address: string, family: 4 | 6): boolean {
  return family === 4
    ? !BLOCKED_IPV4_ADDRESSES.check(address, "ipv4")
    : !BLOCKED_IPV6_ADDRESSES.check(address, "ipv6");
}

async function resolvePublicShelfHostname(hostname: string): Promise<string[]> {
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (
    addresses.length === 0 ||
    addresses.some(
      ({ address, family }) =>
        (family !== 4 && family !== 6) || !isPublicShelfAddress(address, family)
    )
  ) {
    throw new Error("Shelf URL resolved to a non-public address");
  }
  return addresses.map(({ address }) => address).sort();
}

async function assertStablePublicShelfUrl(rawUrl: string): Promise<void> {
  const hostname = new URL(shelfFetchUrl(rawUrl)).hostname;
  const firstResolution = await resolvePublicShelfHostname(hostname);
  // react-doctor-disable-next-line react-doctor/server-sequential-independent-await -- ordered observations detect DNS changes
  const secondResolution = await resolvePublicShelfHostname(hostname);
  if (
    firstResolution.length !== secondResolution.length ||
    firstResolution.some(
      (address, index) => address !== secondResolution[index]
    )
  ) {
    throw new Error("Shelf URL DNS resolution changed during validation");
  }
}

function cleanTitle(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const collapsed = value.replace(WHITESPACE_RUN, " ").trim();
  if (collapsed.length === 0) {
    return null;
  }
  return collapsed.slice(0, GEO_SHELF_TITLE_MAX_LENGTH);
}

function cleanDescription(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const collapsed = value.replace(WHITESPACE_RUN, " ").trim();
  return collapsed.length > 0 ? collapsed : null;
}

function hasContextDevKey(): boolean {
  return Boolean(process.env.CONTEXT_DEV_API_KEY?.trim());
}

export async function previewGeoShelfUrl(
  rawUrl: string
): Promise<GeoShelfPreview> {
  const url = canonicalizeShelfUrl(rawUrl);
  const domain = shelfDomainFromUrl(url);
  const unavailable: GeoShelfPreview = {
    url,
    finalUrl: null,
    domain,
    title: null,
    description: null,
    available: false,
  };

  if (!hasContextDevKey()) {
    return unavailable;
  }

  try {
    const fetchUrl = shelfFetchUrl(rawUrl);
    await assertStablePublicShelfUrl(fetchUrl);
    const page = await fetchWebpage({
      // Hash and tracking params stripped so variants share a cache entry, but
      // the host is kept as typed because not every site serves the apex domain.
      url: fetchUrl,
      includeImages: false,
      includeLinks: false,
      onlyMainContent: true,
      maxAgeMs: GEO_SHELF_PREVIEW_CACHE_MS,
      timeoutMS: GEO_SHELF_PREVIEW_TIMEOUT_MS,
    });
    const finalUrl = page.metadata?.finalUrl ?? page.url ?? null;
    if (finalUrl) {
      // Context.dev follows redirects remotely and does not expose each hop. At
      // minimum, reject an unsafe or unstable final destination before trusting
      // any metadata returned for it.
      await assertStablePublicShelfUrl(finalUrl);
    }
    return {
      url,
      finalUrl,
      domain,
      title: cleanTitle(page.metadata?.title),
      description: cleanDescription(page.metadata?.description),
      available: true,
    };
  } catch (error) {
    console.warn("[GEO] shelf preview failed", {
      url,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return unavailable;
  }
}
