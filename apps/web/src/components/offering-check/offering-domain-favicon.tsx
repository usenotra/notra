import { cn } from "@notra/ui/lib/utils";
import { useEffect, useState } from "react";

import { OFFERING_FAVICON_SETTLE_MS } from "@/constants/offering-check";
import type { OfferingDomainFaviconProps } from "@/types/offering-check";
import { normalizeDomain } from "@/utils/offering-check";

import { OfferingFavicon } from "./offering-favicon";

/** Shows the favicon once typing pauses on a valid domain, so it does not flicker per keystroke. */
export function OfferingDomainFavicon({ value }: OfferingDomainFaviconProps) {
  const [domain, setDomain] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(
      () => setDomain(normalizeDomain(value)),
      OFFERING_FAVICON_SETTLE_MS
    );
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <span
      className={cn(
        "grid shrink-0 self-center transition-[width,opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
        domain ? "w-7 opacity-100" : "w-0 scale-50 opacity-0 blur-[2px]"
      )}
    >
      {domain ? (
        <OfferingFavicon
          className="size-7 rounded-lg"
          domain={domain}
          key={domain}
        />
      ) : null}
    </span>
  );
}
