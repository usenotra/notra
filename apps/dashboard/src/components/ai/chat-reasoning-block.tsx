"use client";

import { MessageResponse } from "@notra/ui/components/ai-elements/message";

import type { ChatReasoningBlockProps } from "@/types/components/chat-reasoning-block";

export function ChatReasoningBlock({ children }: ChatReasoningBlockProps) {
  return (
    <div className="min-w-0">
      <MessageResponse className="text-muted-foreground text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {children}
      </MessageResponse>
    </div>
  );
}
