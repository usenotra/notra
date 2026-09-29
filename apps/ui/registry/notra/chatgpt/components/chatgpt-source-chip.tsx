"use client";

import { cn } from "cn";

import { badgeVariants } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";

import {
  CHATGPT_CHIP_HOVER_CLOSE_DELAY_MS,
  CHATGPT_CHIP_HOVER_OPEN_DELAY_MS,
} from "../constants/chatgpt";
import type { ChatgptSourceChipProps } from "../types/chatgpt";
import { ChatgptFavicon } from "./chatgpt-favicon";

export const ChatgptSourceChip = ({
  className,
  rel = "noopener noreferrer",
  sources,
  target = "_blank",
  ...props
}: ChatgptSourceChipProps) => {
  const [first] = sources;
  if (!first) {
    return null;
  }
  const extra = sources.length - 1;

  return (
    <HoverCard>
      <HoverCardTrigger
        aria-label={
          extra > 0 ? `${first.publisher} (+${extra})` : first.publisher
        }
        className={cn(
          badgeVariants({ variant: "secondary" }),
          "bg-chatgpt-hover text-chatgpt-muted hover:bg-chatgpt-border hover:text-chatgpt-fg focus-visible:outline-chatgpt-focus mx-0.5 h-5 gap-1 rounded-full border-0 px-2 align-middle text-xs leading-none font-normal no-underline focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-solid motion-reduce:transition-none",
          className
        )}
        closeDelay={CHATGPT_CHIP_HOVER_CLOSE_DELAY_MS}
        data-slot="chatgpt-source-chip"
        delay={CHATGPT_CHIP_HOVER_OPEN_DELAY_MS}
        href={first.href}
        rel={rel}
        target={target}
        {...props}
      >
        {first.publisher}
        {extra > 0 ? <span>+{extra}</span> : null}
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        className="bg-chatgpt-popover font-chatgpt text-chatgpt-fg shadow-chatgpt-menu w-80 max-w-[calc(100vw-2rem)] gap-0 rounded-2xl p-0 ring-0"
        sideOffset={8}
      >
        <ul className="flex flex-col">
          {sources.slice(0, 3).map((source, index) => (
            <li key={source.id}>
              {index > 0 ? <Separator className="bg-chatgpt-border" /> : null}
              <div className="flex flex-col gap-1 p-3">
                <div className="text-chatgpt-muted flex items-center gap-1.5 text-xs leading-4">
                  <ChatgptFavicon
                    className="size-4"
                    domain={source.domain}
                    src={source.favicon}
                  />
                  {source.publisher}
                </div>
                <p className="text-[0.9375rem] leading-5 font-medium">
                  {source.title}
                </p>
                <p className="text-chatgpt-muted line-clamp-2 text-[0.8125rem] leading-[1.15rem]">
                  {source.snippet}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
};
