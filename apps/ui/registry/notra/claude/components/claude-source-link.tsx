import { cn } from "cn";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import {
  CLAUDE_HOVER_CLOSE_DELAY_MS,
  CLAUDE_HOVER_OPEN_DELAY_MS,
} from "../constants/claude";
import { claudeFaviconSrc } from "../lib/claude-search";
import type { ClaudeSourceLinkProps } from "../types/claude";

export const ClaudeSourceLink = ({
  children,
  className,
  rel = "noopener noreferrer",
  source,
  target = "_blank",
  ...props
}: ClaudeSourceLinkProps) => (
  <HoverCard>
    <HoverCardTrigger
      className={cn(
        "text-claude-check decoration-claude-check focus-visible:outline-claude-check rounded-xs underline decoration-2 underline-offset-2 focus-visible:outline-2 focus-visible:outline-solid",
        className
      )}
      closeDelay={CLAUDE_HOVER_CLOSE_DELAY_MS}
      data-slot="claude-source-link"
      delay={CLAUDE_HOVER_OPEN_DELAY_MS}
      href={source.href}
      rel={rel}
      target={target}
      {...props}
    >
      {children ?? source.title}
    </HoverCardTrigger>
    <HoverCardContent
      align="start"
      className="bg-claude-popover font-claude text-claude-fg ring-claude-popover-border w-72 max-w-[calc(100vw-2rem)] rounded-xl p-3 shadow-[0_4px_24px_var(--claude-popover-shadow)]"
      sideOffset={8}
    >
      <p className="text-sm leading-5 text-balance">{source.title}</p>
      <p className="text-claude-muted mt-1.5 flex items-center gap-1.5 text-xs leading-4">
        <Avatar className="size-4 rounded-sm after:hidden">
          <AvatarImage
            alt=""
            className="rounded-sm bg-white"
            src={source.favicon ?? claudeFaviconSrc(source.domain)}
          />
          <AvatarFallback className="bg-claude-hover rounded-sm" />
        </Avatar>
        {source.domain}
      </p>
    </HoverCardContent>
  </HoverCard>
);
