import { Resolver } from "node:dns/promises";
import { isIP } from "node:net";

import { WEBSITE_DNS_TIMEOUT_MS } from "./constants/url";
import { isDemoMode } from "./demo-mode";
import { assertPublicHttpUrl, PublicUrlValidationError } from "./url";

export async function assertPublicWebsiteUrlResolution(
  raw: string
): Promise<void> {
  assertPublicHttpUrl(raw);
  if (isDemoMode()) {
    return;
  }

  const hostname = new URL(raw).hostname.replace(/^\[|\]$/g, "");
  if (isIP(hostname)) {
    return;
  }
  const resolver = new Resolver({ timeout: WEBSITE_DNS_TIMEOUT_MS, tries: 1 });
  const timer = setTimeout(() => resolver.cancel(), WEBSITE_DNS_TIMEOUT_MS);
  try {
    const results = await Promise.allSettled([
      resolver.resolve4(hostname),
      resolver.resolve6(hostname),
    ]);
    const addresses = results.flatMap((result, index) =>
      result.status === "fulfilled"
        ? result.value.map((address) => ({
            address,
            family: index === 0 ? 4 : 6,
          }))
        : []
    );
    if (addresses.length === 0) {
      const temporary = results.some(
        (result) =>
          result.status === "rejected" &&
          result.reason?.code !== "ENOTFOUND" &&
          result.reason?.code !== "ENODATA"
      );
      throw new PublicUrlValidationError(
        temporary
          ? "Website domain check is temporarily unavailable. Please try again."
          : "Website domain could not be resolved. Please check the domain name.",
        temporary ? "temporary" : "not_found"
      );
    }
    for (const { address, family } of addresses) {
      assertPublicHttpUrl(`http://${family === 6 ? `[${address}]` : address}`);
    }
  } finally {
    clearTimeout(timer);
  }
}
