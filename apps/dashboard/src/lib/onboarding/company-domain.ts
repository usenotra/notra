import type { LookupAddress } from "node:dns";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

import { assertPublicHttpUrl, resolvePublicHttpUrl } from "@notra/utils/url";
import { DOMAINS } from "free-email-domains-list";
import { isValid as isNotDisposableEmail } from "mailchecker";

import {
  SERVER_ERROR_STATUS,
  WEBSITE_REACHABILITY_MAX_REDIRECTS,
  WEBSITE_REACHABILITY_TIMEOUT_MS,
  WWW_PREFIX_PATTERN,
} from "@/constants/onboarding-agent";
import type { CompanyDomainResolution } from "@/types/onboarding-agent";

function extractDomain(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  const withProtocol = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
  try {
    const hostname = new URL(withProtocol).hostname.replace(
      WWW_PREFIX_PATTERN,
      ""
    );
    if (!hostname.includes(".") || isIP(hostname) !== 0) {
      return null;
    }
    assertPublicHttpUrl(`https://${hostname}`);
    return hostname;
  } catch {
    return null;
  }
}

function isFreeEmailDomain(domain: string): boolean {
  return DOMAINS.has(domain.toLowerCase());
}

export function resolveCompanyDomain({
  websiteUrl,
  email,
}: {
  websiteUrl?: string;
  email?: string;
}): CompanyDomainResolution | null {
  const websiteDomain = websiteUrl ? extractDomain(websiteUrl) : null;
  if (websiteDomain && !isFreeEmailDomain(websiteDomain)) {
    return { domain: websiteDomain, source: "website" };
  }

  if (email && isNotDisposableEmail(email)) {
    const emailDomain = extractDomain(email.split("@").at(-1) ?? "");
    if (emailDomain && !isFreeEmailDomain(emailDomain)) {
      return { domain: emailDomain, source: "email" };
    }
  }

  return null;
}

function requestWebsiteAddress(
  url: URL,
  method: "HEAD" | "GET",
  address: LookupAddress,
  signal: AbortSignal
) {
  const request = url.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise<readonly [number, string | null]>((resolve, reject) => {
    const outgoingRequest = request(
      url,
      {
        family: address.family,
        lookup: (_hostname, options, callback) => {
          queueMicrotask(() => {
            if (options.all) {
              callback(null, [address]);
              return;
            }
            callback(null, address.address, address.family);
          });
        },
        method,
        signal,
      },
      (response) => {
        const status = response.statusCode ?? SERVER_ERROR_STATUS;
        const location = response.headers.location ?? null;
        response.destroy();
        resolve([status, location]);
      }
    );
    outgoingRequest.once("error", reject);
    outgoingRequest.end();
  });
}

async function requestWebsiteUrl(
  url: URL,
  method: "HEAD" | "GET",
  signal: AbortSignal
) {
  const addresses = await resolvePublicHttpUrl(url.toString());
  let lastError: unknown;
  for (const address of addresses) {
    try {
      const [status, location] = await requestWebsiteAddress(
        url,
        method,
        address,
        signal
      );
      return { location, status };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error(`Could not connect to ${url.hostname}`);
}

async function fetchWebsite(domain: string, method: "HEAD" | "GET") {
  const signal = AbortSignal.timeout(WEBSITE_REACHABILITY_TIMEOUT_MS);
  let url = new URL(`https://${domain}`);
  let redirectsRemaining = WEBSITE_REACHABILITY_MAX_REDIRECTS;
  while (true) {
    const response = await requestWebsiteUrl(url, method, signal);
    if (
      response.status < 300 ||
      response.status >= 400 ||
      response.location === null
    ) {
      return { status: response.status, url: url.toString() };
    }
    if (redirectsRemaining === 0) {
      throw new Error(`Too many redirects while checking ${domain}`);
    }
    redirectsRemaining -= 1;
    url = new URL(response.location, url);
  }
}

async function resolveWebsiteMethodUrl(domain: string, method: "HEAD" | "GET") {
  return await fetchWebsite(domain, method).then(
    (result) => (result.status < SERVER_ERROR_STATUS ? result.url : null),
    () => null
  );
}

export async function resolveReachableWebsiteUrl(
  domain: string
): Promise<string | null> {
  const headUrl = await resolveWebsiteMethodUrl(domain, "HEAD");
  if (headUrl) {
    return headUrl;
  }
  return await resolveWebsiteMethodUrl(domain, "GET");
}
