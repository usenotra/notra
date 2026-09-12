"use client";

import {
  ArrowDown01Icon,
  GlobalIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { GeoChatSkin } from "@notra/geo-core/types/geo";
import { getReferenceDomain } from "@notra/geo-core/utils/reference-display";
import { OpencodeSources } from "@notra/ui/components/brainless/opencode/opencode-sources";
import { PerplexityFavicon } from "@notra/ui/components/brainless/perplexity/perplexity-favicon";
import { PerplexitySearch } from "@notra/ui/components/brainless/perplexity/perplexity-search";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";
import { cn } from "@notra/ui/lib/utils";
import type { PerplexitySearchSource } from "@notra/ui/types/perplexity";
import { useReducedMotion } from "motion/react";
import { useState } from "react";

import {
  GEO_ANSWER_SEARCH_SKIN_CLASS,
  GEO_ANSWER_SEARCHED_THE_WEB,
} from "@/constants/geo-answer-search";
import type { GeoAnswerCitedSearchSkin } from "@/types/geo-answer-search";
import { geoAnswerSearchSourceCountLabel } from "@/utils/geo-answer-search-label";
import { getSafeReferenceSourceUrl } from "@/utils/reference-source-url";

const EMPTY_QUERIES: readonly string[] = [];

const PANEL_CLASS =
  "grid overflow-hidden outline-none transition-[grid-template-rows,opacity] duration-slow ease-emphasized data-closed:grid-rows-[0fr] data-open:grid-rows-[1fr] data-[ending-style]:grid-rows-[0fr] data-[ending-style]:opacity-0 data-[starting-style]:grid-rows-[0fr] data-[starting-style]:opacity-0 motion-reduce:transition-none";

function citedSourceHref(url: string | undefined): string | null {
  return url ? getSafeReferenceSourceUrl(url) : null;
}

function citedSourceDomain(source: PerplexitySearchSource): string {
  return getReferenceDomain(source.url) ?? source.domain;
}

function CitedSourceRow({
  source,
  titleClassName,
  domainClassName,
}: {
  source: PerplexitySearchSource;
  titleClassName: string;
  domainClassName: string;
}) {
  const href = citedSourceHref(source.url);
  const domain = citedSourceDomain(source);
  const rowClassName =
    "grid grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-2.5";
  const cells = (
    <>
      <PerplexityFavicon className="size-4" domain={domain || source.domain} />
      <p className={cn("min-w-0 truncate", titleClassName)}>{source.title}</p>
      <span
        className={cn(
          "max-w-[7.5rem] shrink-0 truncate text-[12px] leading-none",
          domainClassName
        )}
      >
        {domain.replace(/^www\./, "")}
      </span>
    </>
  );

  return (
    <li>
      {href ? (
        <a
          className={cn(
            rowClassName,
            "hover:text-foreground focus-visible:ring-ring rounded-sm outline-none focus-visible:ring-2"
          )}
          href={href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {cells}
        </a>
      ) : (
        <div className={rowClassName}>{cells}</div>
      )}
    </li>
  );
}

function CitedSearchPanel({
  skin,
  sources,
  queries,
}: {
  skin: GeoAnswerCitedSearchSkin;
  sources: readonly PerplexitySearchSource[];
  queries: readonly string[];
}) {
  const [open, setOpen] = useState(true);
  const classes = GEO_ANSWER_SEARCH_SKIN_CLASS[skin];
  const hasBody = queries.length > 0 || sources.length > 0;

  const header = (
    <>
      <span className="relative flex size-4 shrink-0 items-center justify-center">
        <HugeiconsIcon
          className="text-muted-foreground"
          icon={GlobalIcon}
          size={15}
          strokeWidth={1.7}
        />
      </span>
      <span className={cn("min-w-0 flex-1 truncate", classes.title)}>
        {GEO_ANSWER_SEARCHED_THE_WEB}
      </span>
      {sources.length > 0 ? (
        <span className="text-muted-foreground shrink-0 text-[12px] leading-none tabular-nums">
          {geoAnswerSearchSourceCountLabel(sources.length)}
        </span>
      ) : null}
    </>
  );

  if (!hasBody) {
    return (
      <div className={cn("w-full max-w-[42rem]", classes.root)}>
        <div className="flex w-full items-center gap-2 py-0.5">{header}</div>
      </div>
    );
  }

  return (
    <Collapsible
      className={cn("w-full max-w-[42rem]", classes.root)}
      onOpenChange={setOpen}
      open={open}
    >
      <CollapsibleTrigger className="group/search flex w-full items-center gap-2 rounded-md py-0.5 text-left transition-colors outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-black/15">
        {header}
        <HugeiconsIcon
          className="text-muted-foreground duration-slow ease-emphasized shrink-0 transition-transform group-data-panel-open/search:rotate-180 motion-reduce:transition-none"
          icon={ArrowDown01Icon}
          size={14}
          strokeWidth={2}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className={PANEL_CLASS} keepMounted>
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-2.5 pt-2">
            {queries.map((query) => (
              <div
                className={cn("flex items-start gap-2.5", classes.query)}
                key={query}
              >
                <HugeiconsIcon
                  className="text-muted-foreground mt-0.5 shrink-0"
                  icon={Search01Icon}
                  size={14}
                  strokeWidth={1.75}
                />
                <p className="min-w-0">{query}</p>
              </div>
            ))}
            {sources.length > 0 ? (
              <ul className="flex flex-col gap-2.5">
                {sources.map((source) => (
                  <CitedSourceRow
                    domainClassName={classes.sourceDomain}
                    key={`${source.domain}-${source.title}`}
                    source={source}
                    titleClassName={classes.sourceTitle}
                  />
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function GeoAnswerSearch({
  skin,
  sources,
  queries = EMPTY_QUERIES,
  sequential = false,
}: {
  skin: GeoChatSkin;
  sources: readonly PerplexitySearchSource[];
  queries?: readonly string[];
  sequential?: boolean;
}) {
  const reducedMotion = Boolean(useReducedMotion());

  if (skin === "perplexity") {
    return (
      <PerplexitySearch
        queries={queries}
        sources={sources}
        title="Web search"
      />
    );
  }

  if (skin === "claude") {
    return (
      <CitedSearchPanel queries={queries} skin="claude" sources={sources} />
    );
  }

  if (skin === "gemini") {
    return (
      <CitedSearchPanel queries={queries} skin="gemini" sources={sources} />
    );
  }

  if (skin === "opencode" || skin === "claude-code" || skin === "codex") {
    return (
      <OpencodeSources
        darkSurface={skin !== "opencode"}
        queries={queries}
        reducedMotion={reducedMotion}
        sequential={sequential}
        sources={sources}
      />
    );
  }

  return (
    <CitedSearchPanel queries={queries} skin="chatgpt" sources={sources} />
  );
}
