"use client";

import { cn } from "cn";
import { useState } from "react";

import {
  ChatMinimap,
  ChatMinimapItem,
  ChatMinimapNavButton,
} from "../components/chat-minimap";
import {
  CHAT_MINIMAP_DEMO_TURNS,
  CHAT_MINIMAP_VISIBLE_TURNS,
} from "../constants/chat-minimap";
import type { ChatMinimapExampleProps } from "../types/chat-minimap";

export default function ChatMinimapExample({
  initialStart = 2,
  side = "right",
  turns = CHAT_MINIMAP_DEMO_TURNS,
}: ChatMinimapExampleProps) {
  const [start, setStart] = useState(initialStart);
  const lastStart = turns.length - CHAT_MINIMAP_VISIBLE_TURNS;
  const clampStart = (next: number) => Math.min(Math.max(next, 0), lastStart);

  return (
    <div
      className={cn(
        "flex w-full px-6 py-10",
        side === "left" ? "justify-end" : "justify-start"
      )}
    >
      <ChatMinimap side={side}>
        <ChatMinimapNavButton
          direction="previous"
          disabled={start === 0}
          onClick={() => setStart((current) => clampStart(current - 1))}
        />
        {turns.map((turn, index) => (
          <ChatMinimapItem
            active={
              index >= start && index < start + CHAT_MINIMAP_VISIBLE_TURNS
            }
            description={turn.description}
            key={turn.id}
            onClick={() => setStart(clampStart(index - 1))}
            title={turn.title}
          />
        ))}
        <ChatMinimapNavButton
          direction="next"
          disabled={start === lastStart}
          onClick={() => setStart((current) => clampStart(current + 1))}
        />
      </ChatMinimap>
    </div>
  );
}
