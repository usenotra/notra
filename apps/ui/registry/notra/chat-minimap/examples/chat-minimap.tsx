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

const LAST_START = CHAT_MINIMAP_DEMO_TURNS.length - CHAT_MINIMAP_VISIBLE_TURNS;

const clampStart = (start: number) => Math.min(Math.max(start, 0), LAST_START);

export default function ChatMinimapExample({
  side = "right",
}: ChatMinimapExampleProps) {
  const [start, setStart] = useState(2);

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
        {CHAT_MINIMAP_DEMO_TURNS.map((turn, index) => (
          <ChatMinimapItem
            active={
              index >= start && index < start + CHAT_MINIMAP_VISIBLE_TURNS
            }
            description={turn.description}
            key={turn.title}
            onClick={() => setStart(clampStart(index - 1))}
            title={turn.title}
          />
        ))}
        <ChatMinimapNavButton
          direction="next"
          disabled={start === LAST_START}
          onClick={() => setStart((current) => clampStart(current + 1))}
        />
      </ChatMinimap>
    </div>
  );
}
