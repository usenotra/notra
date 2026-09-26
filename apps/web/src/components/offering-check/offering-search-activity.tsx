import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CSSProperties } from "react";

import type { OfferingSearchActivityProps } from "@/types/offering-check";

import { OfferingFavicon } from "./offering-favicon";

const MAX_VISIBLE_DOMAINS = 8;
const STAGGER_MS = 70;

const ENTER_CLASS =
  "animate-in fade-in slide-in-from-left-1 fill-mode-both delay-(--enter-delay) duration-500 ease-out motion-reduce:animate-none";

export function OfferingSearchActivity({
  queries,
  domains,
}: OfferingSearchActivityProps) {
  const visibleDomains = domains.slice(0, MAX_VISIBLE_DOMAINS);
  const hiddenDomains = domains.length - visibleDomains.length;

  return (
    <div className="flex flex-col gap-2 text-[14px] leading-6">
      <ul className="flex flex-col gap-1">
        {queries.map((query, index) => (
          <li
            className={`text-foreground flex items-start gap-2 ${ENTER_CLASS}`}
            key={query}
            style={
              { "--enter-delay": `${index * STAGGER_MS}ms` } as CSSProperties
            }
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
          {visibleDomains.map((domain, index) => (
            <li
              className={`bg-muted text-foreground inline-flex max-w-full items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-1.5 text-[13px] leading-5 ${ENTER_CLASS}`}
              key={domain}
              style={
                {
                  "--enter-delay": `${(queries.length + index) * STAGGER_MS}ms`,
                } as CSSProperties
              }
            >
              <OfferingFavicon
                className="size-3.5 rounded-sm"
                domain={domain}
              />
              <span className="truncate">{domain}</span>
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
