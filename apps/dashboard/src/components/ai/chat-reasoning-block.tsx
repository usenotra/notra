"use client";

import { AiBrain01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { MessageResponse } from "@notra/ui/components/ai-elements/message";
import { BrailleLoader } from "@notra/ui/components/shared/braille-loader";

import type { ChatReasoningBlockProps } from "@/types/components/chat-reasoning-block";
import { splitReasoningText } from "@/utils/split-reasoning-text";

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
