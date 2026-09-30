"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PerplexityFavicon } from "@notra/ui/components/ai-skins/perplexity/perplexity-favicon";
import type { PerplexitySearchSource } from "@notra/ui/types/perplexity";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@notra/ui/components/ui/sheet";
import { cn } from "@notra/ui/lib/utils";

const PREVIEW_COUNT = 3;

function previewSources(sources: readonly PerplexitySearchSource[]) {
  const seen = new Set<string>();
  const preview: PerplexitySearchSource[] = [];

  for (const source of sources) {
    if (seen.has(source.domain)) {
      continue;
    }
    seen.add(source.domain);
    preview.push(source);
    if (preview.length === PREVIEW_COUNT) {
      break;
    }
  }

  return preview;
}

function sourceHref(source: PerplexitySearchSource) {
  if (source.url) {
    return source.url;
  }

  return `https://${source.domain.replace(/^www\./, "")}`;
}

function displayDomain(domain: string) {
  return domain.replace(/^www\./, "");
}

export function PerplexitySourcesSheet({
  sources,
  className,
}: {
  sources: readonly PerplexitySearchSource[];
  className?: string;
}) {
  if (sources.length === 0) {
    return null;
  }

  const preview = previewSources(sources);
  const countLabel = `${sources.length} ${sources.length === 1 ? "source" : "sources"}`;

  return (
    <Sheet>
      <SheetTrigger
        className={cn(
          "ms-1.5 flex h-8 cursor-pointer items-center gap-2 rounded-full px-1.5 text-[13px] leading-none text-[#8d8d8d] outline-none transition-[color,background-color,transform] duration-fast hover:bg-[#f3f3f3] hover:text-[#5c5c5c] focus-visible:ring-2 focus-visible:ring-black/15 active:scale-[0.96] dark:text-[#a3a3a3] dark:hover:bg-white/10 dark:hover:text-foreground dark:focus-visible:ring-white/20",
          className
        )}
        render={<button type="button" />}
      >
        <span aria-hidden className="flex items-center -space-x-1.5">
          {preview.map((source, index) => (
            <PerplexityFavicon
              className="size-4 rounded-full ring-[1.5px] ring-white dark:ring-[#111]"
              domain={source.domain}
              key={`${source.domain}-${index}`}
            />
          ))}
        </span>
        <span>{countLabel}</span>
      </SheetTrigger>
      <SheetContent
        className="w-full gap-0 p-0 sm:max-w-[24rem]"
        showCloseButton={false}
        side="right"
      >
        <SheetHeader className="flex-row items-center justify-between space-y-0 px-5 py-4">
          <SheetTitle className="text-[16px] font-semibold">Sources</SheetTitle>
          <SheetDescription className="sr-only">
            {countLabel} used in this answer
          </SheetDescription>
          <SheetClose
            render={
              <button
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-full text-[#8d8d8d] outline-none transition-colors hover:bg-[#f3f3f3] hover:text-[#1a1a1a] focus-visible:ring-2 focus-visible:ring-black/15 dark:hover:bg-white/10 dark:hover:text-foreground"
                type="button"
              />
            }
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
          </SheetClose>
        </SheetHeader>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {sources.map((source, index) => (
            <li key={`${source.domain}-${source.title}`}>
              <a
                className="flex items-start gap-3 rounded-xl px-3 py-2.5 outline-none transition-colors hover:bg-[#f5f5f5] focus-visible:ring-2 focus-visible:ring-black/15 dark:hover:bg-white/8"
                href={sourceHref(source)}
                rel="noreferrer"
                target="_blank"
              >
                <span className="w-4 shrink-0 pt-0.5 text-right font-sans text-[12px] tabular-nums text-[#8d8d8d]">
                  {index + 1}
                </span>
                <PerplexityFavicon
                  className="mt-0.5 size-4 shrink-0 rounded-full"
                  domain={source.domain}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-sans text-[14px] leading-5 text-[#1a1a1a] dark:text-foreground">
                    {source.title}
                  </span>
                  <span className="mt-0.5 block truncate font-sans text-[12px] leading-4 text-[#8d8d8d]">
                    {displayDomain(source.domain)}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
