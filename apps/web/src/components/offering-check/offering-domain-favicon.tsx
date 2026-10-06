import { cn } from "@notra/ui/lib/utils";
import { useEffect, useState } from "react";

import {
  OFFERING_FAVICON_FALLBACK_SIZE,
  OFFERING_FAVICON_SETTLE_MS,
} from "@/constants/offering-check";
import type { OfferingDomainFaviconProps } from "@/types/offering-check";
import { normalizeDomain, offeringFaviconUrl } from "@/utils/offering-check";

/**
 * Shows the site's favicon next to the domain field, but only once a real
 * icon has loaded. Nothing shows while it loads, when it fails, or when Google
 * only has its small default globe for the domain.
 */
export function OfferingDomainFavicon({ value }: OfferingDomainFaviconProps) {
  const [domain, setDomain] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);

  // Waits for a pause in typing so intermediate domains are never fetched.
  useEffect(() => {
    const timer = setTimeout(
      () => setDomain(normalizeDomain(value)),
      OFFERING_FAVICON_SETTLE_MS
    );
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    if (!domain) {
      return;
    }
    let active = true;
    const image = new Image();
    image.onload = () => {
      if (active && image.naturalWidth > OFFERING_FAVICON_FALLBACK_SIZE) {
        setLoaded(domain);
      }
    };
    image.src = offeringFaviconUrl(domain);
    return () => {
      active = false;
    };
  }, [domain]);

  // Hides at once when the text changes, not only after the next settle.
  const visible =
    loaded !== null && loaded === domain && normalizeDomain(value) === domain;

  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 self-center transition-[width,margin,opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
        visible
          ? "me-2 w-7 opacity-100"
          : "me-0 w-0 scale-50 opacity-0 blur-[2px]"
      )}
    >
      {loaded ? (
        <img
          alt=""
          className="size-7 rounded-lg"
          height={28}
          src={offeringFaviconUrl(loaded)}
          width={28}
        />
      ) : null}
    </span>
  );
}
