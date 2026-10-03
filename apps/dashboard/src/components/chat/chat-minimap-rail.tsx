"use client";

import { useUiLabels } from "@notra/ui/components/shared/ui-labels-provider";
import {
  ChatMinimap,
  ChatMinimapItem,
  ChatMinimapNavButton,
} from "@notra/ui/components/ui/chat-minimap";
import {
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
} from "@notra/ui/components/ui/message-scroller";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import type { ChatMinimapRailProps } from "@/types/chat-minimap";

const MIN_TURNS = 2;

export function ChatMinimapRail({ className, turns }: ChatMinimapRailProps) {
  const labels = useUiLabels();
  const { scrollToMessage } = useMessageScroller();
  const { visibleMessageIds } = useMessageScrollerVisibility();
  const scrollable = useMessageScrollerScrollable();
  const listRef = useRef<HTMLDivElement>(null);

  const visibleIds = new Set(visibleMessageIds);
  const isTurnVisible = turns.map((turn) =>
    turn.messageIds.some((id) => visibleIds.has(id))
  );
  const firstVisibleIndex = isTurnVisible.indexOf(true);
  const lastIndex = turns.length - 1;

  // Long threads overflow the rail, so keep the active line inside it.
  useEffect(() => {
    const list = listRef.current;
    const item = list?.children[firstVisibleIndex];
    if (!(list && item instanceof HTMLElement)) {
      return;
    }
    const top = item.offsetTop - list.offsetTop;
    const bottom = top + item.offsetHeight;
    if (top < list.scrollTop) {
      list.scrollTop = top;
    } else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
  }, [firstVisibleIndex]);

  if (turns.length < MIN_TURNS) {
    return null;
  }

  const scrollToTurn = (index: number) => {
    const turn = turns[Math.min(Math.max(index, 0), lastIndex)];
    if (turn) {
      scrollToMessage(turn.id, { align: "start", behavior: "smooth" });
    }
  };

  return (
    <ChatMinimap
      className={cn(
        "absolute top-1/2 left-3 z-10 hidden -translate-y-1/2 md:flex",
        className
      )}
      side="right"
    >
      <ChatMinimapNavButton
        direction="previous"
        disabled={!scrollable.start}
        onClick={() => scrollToTurn(firstVisibleIndex - 1)}
      />
      <div
        className="relative flex max-h-[60vh] scrollbar-none flex-col items-start overflow-y-auto"
        ref={listRef}
      >
        {turns.map((turn, index) => (
          <ChatMinimapItem
            active={isTurnVisible[index]}
            description={turn.description}
            key={turn.id}
            onClick={() => scrollToTurn(index)}
            title={turn.title || labels.attachment}
          />
        ))}
      </div>
      <ChatMinimapNavButton
        direction="next"
        disabled={
          !scrollable.end ||
          firstVisibleIndex === -1 ||
          firstVisibleIndex >= lastIndex
        }
        onClick={() => scrollToTurn(firstVisibleIndex + 1)}
      />
    </ChatMinimap>
  );
}
