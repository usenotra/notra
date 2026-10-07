"use client";

import { ClaudeAiIcon } from "@notra/ui/components/ui/svgs/claudeAiIcon";
import { Gemini } from "@notra/ui/components/ui/svgs/gemini";
import { Grok } from "@notra/ui/components/ui/svgs/grok";
import { Kimi } from "@notra/ui/components/ui/svgs/kimi";
import { Openai } from "@notra/ui/components/ui/svgs/openai";
import { Perplexity } from "@notra/ui/components/ui/svgs/perplexity";
import { Zai } from "@notra/ui/components/ui/svgs/zai";
import { cn } from "@notra/ui/lib/utils";
import type { SVGProps } from "react";
import type { PerplexityModelProvider } from "../../../types/perplexity";

function NvidiaMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" {...props}>
      <path
        d="M4.4 13.1c2.4-3.9 5.8-7.1 9.9-9.4-1.9 3.2-2.9 6.4-2.9 9.4 0 2.3.7 4.1 2.8 5.7-3.8-.7-6.8-2.7-9.8-5.7Zm15.2 0c-2.3 3-5.3 5-9.1 5.7 2.1-1.6 2.8-3.4 2.8-5.7 0-3-1-6.2-2.9-9.4 4.1 2.3 7.5 5.5 9.2 9.4ZM12 9.4c2.2 1.9 3.9 4 5.1 6.2-2.8 1.5-4.1 3.3-5.1 5.1-1-1.8-2.3-3.6-5.1-5.1 1.2-2.2 2.9-4.3 5.1-6.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

const ICON_CLASS = "size-4";

export function PerplexityModelIcon({
  provider,
  className,
}: {
  provider: PerplexityModelProvider;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center text-[#8d8d8d] grayscale dark:text-[#a3a3a3]",
        className
      )}
    >
      {provider === "perplexity" ? (
        <Perplexity className={ICON_CLASS} />
      ) : null}
      {provider === "openai" ? <Openai className={ICON_CLASS} /> : null}
      {provider === "google" ? <Gemini className={ICON_CLASS} /> : null}
      {provider === "anthropic" ? (
        <ClaudeAiIcon className={ICON_CLASS} />
      ) : null}
      {provider === "kimi" ? <Kimi className={ICON_CLASS} /> : null}
      {provider === "xai" ? <Grok className={ICON_CLASS} /> : null}
      {provider === "zhipu" ? <Zai className={ICON_CLASS} /> : null}
      {provider === "nvidia" ? <NvidiaMark className={ICON_CLASS} /> : null}
    </span>
  );
}
