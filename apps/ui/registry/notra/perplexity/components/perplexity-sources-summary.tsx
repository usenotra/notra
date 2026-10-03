import { cn } from "cn";

import { AvatarGroup } from "@/components/ui/avatar";

import { PERPLEXITY_SOURCES_PREVIEW_COUNT } from "../constants/perplexity";
import type {
  PerplexitySource,
  PerplexitySourcesSummaryProps,
} from "../types/perplexity";
import { PerplexityFavicon } from "./perplexity-favicon";

const previewSources = (sources: readonly PerplexitySource[]) => {
  const seen = new Set<string>();
  const preview: PerplexitySource[] = [];

  for (const source of sources) {
    if (seen.has(source.domain)) {
      continue;
    }
    seen.add(source.domain);
    preview.push(source);
    if (preview.length === PERPLEXITY_SOURCES_PREVIEW_COUNT) {
      break;
    }
  }

  return preview;
};

export const PerplexitySourcesSummary = ({
  className,
  sources,
  ...props
}: PerplexitySourcesSummaryProps) => {
  if (sources.length === 0) {
    return null;
  }

  const preview = previewSources(sources);

  return (
    <div
      className={cn(
        "font-pplx text-pplx-muted ms-1.5 flex h-8 items-center gap-2 px-2 text-sm leading-5",
        className
      )}
      data-slot="perplexity-sources-summary"
      {...props}
    >
      <AvatarGroup aria-hidden="true" className="-space-x-1.5">
        {preview.map((source) => (
          <PerplexityFavicon
            className="bg-pplx-bg ring-pplx-bg size-4 ring-[1.5px]"
            domain={source.domain}
            key={source.domain}
          />
        ))}
      </AvatarGroup>
      <span>
        {sources.length} {sources.length === 1 ? "source" : "sources"}
      </span>
    </div>
  );
};
