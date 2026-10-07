"use client";

import { Button } from "@notra/ui/components/ui/button";
import { AI_SKIN_BUTTON_RESET } from "@notra/ui/constants/ai-skin-primitives";
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
    <Button
      className={cn(
        AI_SKIN_BUTTON_RESET,
        "inline-flex h-auto cursor-pointer items-center gap-1.5 rounded-sm p-0 text-[14px] leading-5 text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground aria-expanded:bg-transparent aria-expanded:text-muted-foreground dark:hover:bg-transparent",
        className
      )}
      type={type}
      variant="ghost"
      {...props}
    >
      <ChatgptSearchGlyph className="size-3.5 shrink-0 text-[#e4543a]" />
      <span>
        Searched {websites} {noun}
      </span>
    </Button>
  );
}
