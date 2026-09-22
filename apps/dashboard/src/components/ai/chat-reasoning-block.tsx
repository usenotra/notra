"use client";

import { AiBrain01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { MessageResponse } from "@notra/ui/components/ai-elements/message";
import { BrailleLoader } from "@notra/ui/components/shared/braille-loader";

import { REASONING_TITLE_MAX_LENGTH } from "@/constants/chat-activity";
import type { ChatReasoningBlockProps } from "@/types/components/chat-reasoning-block";

function splitReasoningText(text: string): { title: string; body: string } {
  const trimmed = text.trim();
  const newline = trimmed.indexOf("\n");
  const firstLine = (
    newline === -1 ? trimmed : trimmed.slice(0, newline)
  ).trim();
  const rest = newline === -1 ? "" : trimmed.slice(newline + 1).trim();

  if (firstLine.length <= REASONING_TITLE_MAX_LENGTH) {
    return { title: firstLine, body: rest };
  }

  return {
    title: `${firstLine.slice(0, REASONING_TITLE_MAX_LENGTH - 1)}…`,
    body: trimmed,
  };
}

export function ChatReasoningBlock({
  children,
  isStreaming,
}: ChatReasoningBlockProps) {
  const { title, body } = splitReasoningText(children);
  const showBody = Boolean(body);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="text-muted-foreground flex min-w-0 items-center gap-2 text-sm leading-5">
        {isStreaming ? (
          <BrailleLoader className="text-sm" label={title} />
        ) : (
          <>
            <HugeiconsIcon
              className="size-3.5 shrink-0"
              icon={AiBrain01Icon}
              strokeWidth={1.8}
            />
            <span className="min-w-0 truncate">{title}</span>
          </>
        )}
      </div>
      {showBody ? (
        <MessageResponse className="text-muted-foreground pl-6 text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          {body}
        </MessageResponse>
      ) : null}
    </div>
  );
}
