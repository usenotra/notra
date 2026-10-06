import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@notra/ui/lib/utils";

import type { OfferingSearchActivityProps } from "@/types/offering-check";

import { OfferingFavicon } from "./offering-favicon";

const MAX_VISIBLE_DOMAINS = 8;

// Items fade in as the stream delivers them; there is no stagger, the stream
// already spaces them out. Reopening a finished trace shows them at once.
const ENTER_CLASS =
  "animate-in fade-in duration-200 ease-out motion-reduce:animate-none";

export function OfferingSearchActivity({
  queries,
  domains,
  links,
  live,
}: OfferingSearchActivityProps) {
  const visibleDomains = domains.slice(0, MAX_VISIBLE_DOMAINS);
  const hiddenDomains = domains.length - visibleDomains.length;
  const enterClass = live ? ENTER_CLASS : null;

  return (
    <div className="flex flex-col gap-2 text-[14px] leading-6">
      <ul className="flex flex-col gap-1">
        {queries.map((query) => (
          <li
            className={cn("text-foreground flex items-start gap-2", enterClass)}
            key={query}
          >
            <HugeiconsIcon
              className="text-muted-foreground mt-1 size-4 shrink-0"
              icon={Search01Icon}
              strokeWidth={1.75}
            />
            <span className="min-w-0 break-words">{query}</span>
          </li>
        ))}
      </ul>
      {visibleDomains.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5 pt-0.5">
          {visibleDomains.map((domain) => (
            <li className={cn("max-w-full", enterClass)} key={domain}>
              <a
                className="bg-muted text-foreground hover:bg-muted/70 inline-flex max-w-full items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-1.5 text-[13px] leading-5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]"
                href={links[domain] ?? `https://${domain}`}
                rel="noopener noreferrer nofollow"
                target="_blank"
              >
                <OfferingFavicon
                  className="size-3.5 rounded-sm"
                  domain={domain}
                />
                <span className="truncate">{domain}</span>
              </a>
            </li>
          ))}
          {hiddenDomains > 0 ? (
            <li className="text-muted-foreground px-1 text-[13px] leading-6">
              +{hiddenDomains} more
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
