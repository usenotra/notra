"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useState } from "react";

import { OFFERING_YOU_TOOLTIP } from "@/constants/offering-check";
import type {
  OfferingSourceSiteProps,
  OfferingSourcesProps,
} from "@/types/offering-check";

import { OfferingFavicon } from "./offering-favicon";

const STACKED_FAVICONS = 4;
const PAGES_PER_SITE = 4;

function pagePath(url: string): string {
  if (!URL.canParse(url)) {
    return url;
  }
  const parsed = new URL(url);
  const path = `${parsed.pathname}${parsed.search}`;
  return path === "/" ? parsed.hostname : path;
}

function SourceSite({ source }: OfferingSourceSiteProps) {
  const [expanded, setExpanded] = useState(false);
  const pages = expanded ? source.urls : source.urls.slice(0, PAGES_PER_SITE);
  const hidden = source.urls.length - pages.length;

  return (
    <li className="flex flex-col gap-1">
      <span className="flex min-w-0 items-center gap-2 text-[14px] leading-5 font-medium">
        <OfferingFavicon
          className="size-4.5 rounded-full"
          domain={source.domain}
        />
        <span className="truncate">{source.domain}</span>
        {source.own ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  className="shrink-0 cursor-default rounded-md bg-[#EDE6FB] px-1.5 py-0.5 text-[0.6875rem]/4 font-medium text-[#5B3BB5] outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] dark:bg-[#8B5CF633] dark:text-[#C4B5FD]"
                  type="button"
                />
              }
            >
              You
            </TooltipTrigger>
            <TooltipContent>{OFFERING_YOU_TOOLTIP}</TooltipContent>
          </Tooltip>
        ) : null}
      </span>
      <ul className="border-border ml-2 flex flex-col border-l pl-4.25">
        {pages.map((page) => (
          <li className="flex min-w-0 items-center gap-2" key={page.url}>
            <a
              className="text-muted-foreground hover:text-foreground min-w-0 truncate py-0.5 text-[13px] leading-5 transition-colors"
              href={page.url}
              rel="noopener noreferrer nofollow"
              target="_blank"
            >
              {pagePath(page.url)}
            </a>
            {page.cited ? (
              <span className="shrink-0 text-[0.6875rem]/4 font-medium text-[#1C6B3F] dark:text-[#86EFAC]">
                Cited
              </span>
            ) : null}
          </li>
        ))}
        {hidden > 0 ? (
          <li>
            <button
              className="text-muted-foreground/70 hover:text-foreground cursor-pointer rounded-sm py-0.5 text-[13px] leading-5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]"
              onClick={() => setExpanded(true)}
              type="button"
            >
              +{hidden} more
            </button>
          </li>
        ) : null}
      </ul>
    </li>
  );
}

export function OfferingSources({ sources }: OfferingSourcesProps) {
  if (sources.length === 0) {
    return null;
  }
  const pageCount = sources.reduce((total, source) => total + source.pages, 0);

  return (
    <Collapsible className="mt-4 flex flex-col">
      <CollapsibleTrigger className="group bg-muted text-foreground hover:bg-muted/70 inline-flex h-8 cursor-pointer items-center gap-2 self-start rounded-full pr-2.5 pl-2 text-[13px] font-medium transition-[background-color,scale] duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] active:scale-[0.96] motion-reduce:active:scale-100">
        <span className="flex items-center -space-x-1.5">
          {sources.slice(0, STACKED_FAVICONS).map((source) => (
            <OfferingFavicon
              className="ring-muted size-4.5 rounded-full ring-2"
              domain={source.domain}
              key={source.domain}
            />
          ))}
        </span>
        Sources
        <span className="text-muted-foreground font-normal tabular-nums">
          {pageCount}
        </span>
        <HugeiconsIcon
          className="text-muted-foreground size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[panel-open]:rotate-180 motion-reduce:transition-none"
          icon={ArrowDown01Icon}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[ending-style]:h-0 data-[ending-style]:opacity-0 data-[starting-style]:h-0 data-[starting-style]:opacity-0 motion-reduce:transition-none">
        <ul className="flex flex-col gap-4 pt-4 pl-2">
          {sources.map((source) => (
            <SourceSite key={source.domain} source={source} />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
