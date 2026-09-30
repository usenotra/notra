"use client";

import { cn } from "@notra/ui/lib/utils";
import { PerplexityFavicon } from "@notra/ui/components/ai-skins/perplexity/perplexity-favicon";

function ShieldMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      viewBox="0 0 12 12"
    >
      <path
        d="M6 1.15 10.2 2.7v3.05c0 2.28-1.72 3.86-4.2 4.95-2.48-1.09-4.2-2.67-4.2-4.95V2.7L6 1.15Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.15"
      />
      <path
        d="M4.15 6.05 5.35 7.2 7.9 4.55"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.15"
      />
    </svg>
  );
}

export function PerplexityCitation({
  label,
  domain,
  extra,
  className,
}: {
  label: string;
  domain?: string;
  extra?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative mx-0.5 inline-flex max-w-full translate-y-[-0.06em] items-center gap-1 whitespace-nowrap rounded-full bg-[#f0f0f0] py-[2px] pr-1.5 pl-1 align-baseline font-sans text-[11px] leading-none text-[#6b6b6b] dark:bg-white/10 dark:text-[#b3b3b3]",
        className
      )}
    >
      {domain ? (
        <PerplexityFavicon className="size-3" domain={domain} />
      ) : (
        <ShieldMark className="size-3 text-[#8a8a8a] dark:text-[#a3a3a3]" />
      )}
      <span className="max-w-[9rem] truncate">{label}</span>
      {extra ? <span className="text-[#8d8d8d]">+{extra}</span> : null}
    </span>
  );
}
