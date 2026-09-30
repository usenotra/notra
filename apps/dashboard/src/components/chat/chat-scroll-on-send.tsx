"use client";

import { useMessageScroller } from "@notra/ui/components/ui/message-scroller";
import { useLayoutEffect, useRef } from "react";

import type { ChatScrollOnSendProps } from "@/types/components/chat-scroll";

export function ChatScrollOnSend({ lastUserMessageId }: ChatScrollOnSendProps) {
  const previousId = useRef(lastUserMessageId);
  const { scrollToEnd } = useMessageScroller();

  useLayoutEffect(() => {
    if (lastUserMessageId && previousId.current !== lastUserMessageId) {
      scrollToEnd({ behavior: "instant" });
    }
    previousId.current = lastUserMessageId;
  }, [lastUserMessageId, scrollToEnd]);

  return null;
}
