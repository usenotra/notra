"use client";

import { useUiLabels } from "@notra/ui/components/shared/ui-labels-provider";
import {
  ChatMinimap,
  ChatMinimapItem,
  ChatMinimapNavButton,
} from "@notra/ui/components/ui/chat-minimap";
import {
  useMessageScroller,
  useMessageScrollerVisibility,
} from "@notra/ui/components/ui/message-scroller";

import { cn } from "@/lib/utils";
import type { ChatMinimapRailProps } from "@/types/chat-minimap";

const MIN_TURNS = 2;

export function ChatMinimapRail({ className, turns }: ChatMinimapRailProps) {
  const labels = useUiLabels();
  const { scrollToMessage } = useMessageScroller();
  const { visibleMessageIds } = useMessageScrollerVisibility();

  if (turns.length < MIN_TURNS) {
    return null;
  }

  const visibleIds = new Set(visibleMessageIds);
  const isTurnVisible = turns.map((turn) =>
    turn.messageIds.some((id) => visibleIds.has(id))
  );
  const firstVisibleIndex = isTurnVisible.indexOf(true);
  const lastIndex = turns.length - 1;

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
        disabled={firstVisibleIndex <= 0}
        onClick={() => scrollToTurn(firstVisibleIndex - 1)}
      />
      <div className="flex max-h-[60vh] scrollbar-none flex-col items-start overflow-y-auto">
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
        disabled={firstVisibleIndex === -1 || firstVisibleIndex >= lastIndex}
        onClick={() => scrollToTurn(firstVisibleIndex + 1)}
      />
    </ChatMinimap>
  );
}
