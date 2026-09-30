"use client";

import { cn } from "@notra/ui/lib/utils";
import type { ComponentProps } from "react";

function ChatgptSearchGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      viewBox="0 0 16 16"
    >
      <circle
        cx="8"
        cy="8"
        r="5.35"
        stroke="currentColor"
        strokeDasharray="1.05 1.7"
        strokeLinecap="round"
        strokeWidth="1.35"
      />
      <ellipse
        cx="8"
        cy="8"
        rx="5.35"
        ry="2.15"
        stroke="currentColor"
        strokeDasharray="0.9 1.65"
        strokeLinecap="round"
        strokeWidth="1.05"
      />
    </svg>
  );
}

export function ChatgptSearch({
  websites,
  className,
  type = "button",
  ...props
}: {
  websites: number;
} & ComponentProps<"button">) {
  const noun = websites === 1 ? "website" : "websites";

  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-sm text-[14px] leading-5 text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
      type={type}
      {...props}
    >
      <ChatgptSearchGlyph className="size-3.5 shrink-0 text-[#e4543a]" />
      <span>
        Searched {websites} {noun}
      </span>
    </button>
  );
}
