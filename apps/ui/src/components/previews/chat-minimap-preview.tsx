import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  ChatMinimap,
  ChatMinimapItem,
} from "../../../registry/notra/chat-minimap/components/chat-minimap";
import { CHAT_MINIMAP_DEMO_TURNS } from "../../../registry/notra/chat-minimap/constants/chat-minimap";

const PREVIEW_TURNS = CHAT_MINIMAP_DEMO_TURNS.slice(0, 9);
const ACTIVE_TURN_INDEX = 3;
const activeTurn = PREVIEW_TURNS[ACTIVE_TURN_INDEX];

export default function ChatMinimapPreview() {
  return (
    <div className="flex items-center gap-2 self-center pb-6">
      <ChatMinimap>
        {PREVIEW_TURNS.map((turn, index) => (
          <ChatMinimapItem
            active={Math.abs(index - ACTIVE_TURN_INDEX) <= 1}
            className={index === ACTIVE_TURN_INDEX ? "[&_svg]:w-6" : undefined}
            description={turn.description}
            key={turn.id}
            title={turn.title}
          />
        ))}
      </ChatMinimap>
      {activeTurn ? (
        <Card
          className="bg-popover text-popover-foreground w-56 shadow-lg"
          size="sm"
        >
          <CardHeader className="gap-0.5">
            <CardTitle className="truncate text-sm">
              {activeTurn.title}
            </CardTitle>
            <CardDescription className="line-clamp-2 text-xs leading-relaxed">
              {activeTurn.description}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}
