"use client";

import type { GeoChatSkin } from "@notra/geo-core/types/geo";
import { getReferenceDomain } from "@notra/geo-core/utils/reference-display";
import { ClaudeChatSources } from "@notra/ui/components/brainless/claude-chat/claude-chat-sources";
import { OpencodeSources } from "@notra/ui/components/brainless/opencode/opencode-sources";
import { PerplexitySearch } from "@notra/ui/components/brainless/perplexity/perplexity-search";
import type { PerplexitySearchSource } from "@notra/ui/types/perplexity";
import { useReducedMotion } from "motion/react";

import { getSafeReferenceSourceUrl } from "@/utils/reference-source-url";

const SEARCHED_THE_WEB = "Searched the web";
const EMPTY_QUERIES: readonly string[] = [];

function citedSourceHref(url: string | undefined): string | null {
  return url ? getSafeReferenceSourceUrl(url) : null;
}

function citedSourceDomain(source: PerplexitySearchSource): string {
  return getReferenceDomain(source.url) ?? source.domain;
}

function CitedSourceList({
  sources,
  className,
}: {
  sources: readonly PerplexitySearchSource[];
  className?: string;
}) {
  return (
    <ul className={className}>
      {sources.map((source) => {
        const href = citedSourceHref(source.url);
        const domain = citedSourceDomain(source);
        const label = (
          <>
            <span className="min-w-0 truncate">{source.title}</span>
            <span className="text-muted-foreground shrink-0">{domain}</span>
          </>
        );

        return (
          <li key={`${source.domain}-${source.title}`}>
            {href ? (
              <a
                className="hover:text-foreground focus-visible:ring-ring flex items-baseline justify-between gap-3 rounded-sm text-[13.5px] leading-5 outline-none focus-visible:ring-2"
                href={href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {label}
              </a>
            ) : (
              <p className="flex items-baseline justify-between gap-3 text-[13.5px] leading-5">
                {label}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function QueryList({
  queries,
  className,
}: {
  queries: readonly string[];
  className?: string;
}) {
  if (queries.length === 0) {
    return null;
  }

  return (
    <ul className={className}>
      {queries.map((query) => (
        <li key={query}>{query}</li>
      ))}
    </ul>
  );
}

function ChatgptCitedSearch({
  sources,
  queries,
}: {
  sources: readonly PerplexitySearchSource[];
  queries: readonly string[];
}) {
  if (sources.length === 0 && queries.length === 0) {
    return (
      <p className="text-muted-foreground text-[15px] leading-7">
        {SEARCHED_THE_WEB}
      </p>
    );
  }

  const countLabel =
    sources.length === 1 ? "1 cited source" : `${sources.length} cited sources`;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-[15px] leading-7">
        {sources.length > 0 ? countLabel : SEARCHED_THE_WEB}
      </p>
      <QueryList
        className="text-muted-foreground flex flex-col gap-1 text-[13.5px] leading-5"
        queries={queries}
      />
      {sources.length > 0 ? (
        <CitedSourceList
          className="text-foreground flex flex-col gap-1.5"
          sources={sources}
        />
      ) : null}
    </div>
  );
}

function ClaudeCitedSearch({
  sources,
  queries,
}: {
  sources: readonly PerplexitySearchSource[];
  queries: readonly string[];
}) {
  if (sources.length === 0 && queries.length === 0) {
    return (
      <p className="font-serif text-[16px] leading-none tracking-[-0.01em] text-[#8a8680]">
        {SEARCHED_THE_WEB}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="font-serif text-[16px] leading-none tracking-[-0.01em] text-[#8a8680]">
        {SEARCHED_THE_WEB}
      </p>
      <QueryList
        className="dark:text-muted-foreground flex flex-col gap-1 font-sans text-[13px] leading-5 text-[#5c5a55]"
        queries={queries}
      />
      {sources.length > 0 ? (
        <ClaudeChatSources
          sources={sources.map((source) => ({
            label: citedSourceDomain(source),
          }))}
        />
      ) : null}
    </div>
  );
}

function GeminiCitedSearch({
  sources,
  queries,
}: {
  sources: readonly PerplexitySearchSource[];
  queries: readonly string[];
}) {
  if (sources.length === 0 && queries.length === 0) {
    return (
      <p className="dark:text-muted-foreground text-[14px] leading-5 text-[#5f5f5f]">
        {SEARCHED_THE_WEB}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="dark:text-muted-foreground text-[14px] leading-5 text-[#5f5f5f]">
        {sources.length > 0 ? "Cited sources" : SEARCHED_THE_WEB}
      </p>
      <QueryList
        className="dark:text-muted-foreground flex flex-col gap-1 text-[13.5px] leading-5 text-[#5f5f5f]"
        queries={queries}
      />
      {sources.length > 0 ? (
        <CitedSourceList
          className="dark:text-foreground flex flex-col gap-1.5 text-[#1f1f1f]"
          sources={sources}
        />
      ) : null}
    </div>
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
    return <ClaudeCitedSearch queries={queries} sources={sources} />;
  }

  if (skin === "gemini") {
    return <GeminiCitedSearch queries={queries} sources={sources} />;
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

  return <ChatgptCitedSearch queries={queries} sources={sources} />;
}
