"use client";

import { cn } from "cn";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { badgeVariants } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import {
  GEMINI_FAVICON_URL,
  GEMINI_HOVER_CLOSE_DELAY_MS,
  GEMINI_HOVER_OPEN_DELAY_MS,
} from "../constants/gemini";
import type { GeminiSourceChipProps } from "../types/gemini";

export const GeminiSourceChip = ({
  className,
  rel = "noopener noreferrer",
  source,
  target = "_blank",
  ...props
}: GeminiSourceChipProps) => (
  <HoverCard>
    <HoverCardTrigger
      className={cn(
        badgeVariants({ variant: "secondary" }),
        "bg-gemini-bubble text-gemini-muted hover:bg-gemini-hover hover:text-gemini-fg focus-visible:outline-gemini-focus mx-1 h-6 rounded-full border-0 px-2.5 align-baseline text-[0.8125rem] leading-none font-normal no-underline focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-solid motion-reduce:transition-none",
        className
      )}
      closeDelay={GEMINI_HOVER_CLOSE_DELAY_MS}
      data-slot="gemini-source-chip"
      delay={GEMINI_HOVER_OPEN_DELAY_MS}
      href={source.href}
      rel={rel}
      target={target}
      {...props}
    >
      {source.name}
    </HoverCardTrigger>
    <HoverCardContent
      align="start"
      className="bg-gemini-popover font-gemini text-gemini-fg shadow-gemini-popover ring-gemini-border w-80 max-w-[calc(100vw-2rem)] gap-0 rounded-2xl p-4"
      sideOffset={8}
    >
      <div className="text-gemini-muted flex items-center gap-2 text-sm leading-5">
        <Avatar className="size-4 rounded-sm after:hidden">
          <AvatarImage
            alt=""
            className="rounded-sm"
            src={
              source.favicon ??
              `${GEMINI_FAVICON_URL}?domain=${encodeURIComponent(source.domain)}&sz=64`
            }
          />
          <AvatarFallback className="bg-gemini-hover rounded-sm" />
        </Avatar>
        {source.name}
      </div>
      <p className="mt-2 text-[0.9375rem] leading-5">{source.title}</p>
      {source.description ? (
        <p className="text-gemini-muted mt-2 line-clamp-2 text-[0.8125rem] leading-[1.15rem]">
          {source.description}
        </p>
      ) : null}
    </HoverCardContent>
  </HoverCard>
);
