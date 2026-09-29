"use client";

import { cn } from "cn";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";

import {
  PERPLEXITY_CITATION_CLOSE_DELAY_MS,
  PERPLEXITY_CITATION_OPEN_DELAY_MS,
} from "../constants/perplexity";
import type {
  PerplexityCitationProps,
  PerplexityCitationSource,
} from "../types/perplexity";
import { PerplexityFavicon } from "./perplexity-favicon";
import { PerplexityShieldIcon } from "./perplexity-icons";

const STACK_LIMIT = 3;

const siteName = (domain: string) => {
  const parts = domain.replace(/^www\./, "").split(".");
  return parts.length > 1 ? parts.slice(0, -1).join(".") : domain;
};

interface CitationCardProps {
  sources: readonly PerplexityCitationSource[];
}

const CitationCard = ({ sources }: CitationCardProps) => {
  const [index, setIndex] = useState(0);
  const source = sources[index] as PerplexityCitationSource;
  const step = (delta: number) =>
    setIndex((current) => (current + delta + sources.length) % sources.length);

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-2 py-1.5">
        <div className="text-pplx-muted flex items-center gap-0.5 text-xs tabular-nums">
          <Button
            aria-label="Previous source"
            className="text-pplx-muted hover:bg-pplx-hover hover:text-pplx-fg dark:hover:bg-pplx-hover size-6 rounded-full"
            disabled={sources.length < 2}
            onClick={() => step(-1)}
            size="icon"
            variant="ghost"
          >
            <ChevronLeft className="size-3.5" strokeWidth={1.75} />
          </Button>
          <span aria-live="polite" className="px-1">
            {index + 1}/{sources.length}
          </span>
          <Button
            aria-label="Next source"
            className="text-pplx-muted hover:bg-pplx-hover hover:text-pplx-fg dark:hover:bg-pplx-hover size-6 rounded-full"
            disabled={sources.length < 2}
            onClick={() => step(1)}
            size="icon"
            variant="ghost"
          >
            <ChevronRight className="size-3.5" strokeWidth={1.75} />
          </Button>
        </div>
        <div className="text-pplx-muted flex items-center gap-1.5 text-xs">
          <span aria-hidden="true" className="flex items-center -space-x-1">
            {sources.slice(0, STACK_LIMIT).map((item) => (
              <PerplexityFavicon
                className="ring-pplx-popover size-4 ring-2"
                domain={item.domain}
                key={item.domain}
              />
            ))}
          </span>
          {sources.length} {sources.length === 1 ? "source" : "sources"}
        </div>
      </div>
      <Separator className="bg-pplx-border" />
      <div className="flex flex-col gap-1.5 p-3">
        <div className="text-pplx-muted flex items-center gap-1.5 text-xs">
          <PerplexityFavicon className="size-4" domain={source.domain} />
          {siteName(source.domain)}
        </div>
        <p className="text-pplx-fg text-[0.9375rem] leading-5 font-medium text-balance">
          {source.title}
        </p>
        {source.description ? (
          <p className="text-pplx-muted text-[0.8125rem] leading-5">
            {source.description}
          </p>
        ) : null}
      </div>
    </>
  );
};

export const PerplexityCitation = ({
  className,
  extra,
  label,
  sources,
  ...props
}: PerplexityCitationProps) => {
  const chipClassName = cn(
    badgeVariants({ variant: "secondary" }),
    "bg-pplx-fg/7 text-pplx-fg hover:bg-pplx-fg/12 relative mx-1 h-5 max-w-full translate-y-[-0.1em] gap-1 rounded-md border-0 px-[0.3rem] py-0.75 align-middle font-mono text-[10px] leading-[13.75px] font-normal",
    className
  );
  const chip = (
    <>
      <PerplexityShieldIcon className="text-pplx-muted size-3" />
      <span className="max-w-36 truncate">{label}</span>
      {extra ? <span className="text-pplx-subtle">+{extra}</span> : null}
    </>
  );

  if (!sources || sources.length === 0) {
    return (
      <span
        className={chipClassName}
        data-slot="perplexity-citation"
        {...props}
      >
        {chip}
      </span>
    );
  }

  const [first] = sources;

  return (
    <HoverCard>
      <HoverCardTrigger
        aria-label={extra ? `${label} (+${extra})` : label}
        className={chipClassName}
        closeDelay={PERPLEXITY_CITATION_CLOSE_DELAY_MS}
        data-slot="perplexity-citation"
        delay={PERPLEXITY_CITATION_OPEN_DELAY_MS}
        href={first?.url}
        rel="noopener noreferrer"
        target="_blank"
      >
        {chip}
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        className="bg-pplx-popover font-pplx text-pplx-fg ring-pplx-border w-[min(20rem,calc(100vw-2rem))] gap-0 rounded-xl p-0 shadow-[0_8px_28px_rgb(0_0_0/0.12)] dark:shadow-[0_8px_28px_rgb(0_0_0/0.45)]"
        sideOffset={8}
      >
        <CitationCard sources={sources} />
      </HoverCardContent>
    </HoverCard>
  );
};
