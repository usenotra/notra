import { CHAT_MINIMAP_LONG_TURNS } from "../constants/chat-minimap";
import ChatMinimapExample from "./chat-minimap";

export default function ChatMinimapLongExample() {
  return (
    <ChatMinimapExample initialStart={20} turns={CHAT_MINIMAP_LONG_TURNS} />
  );
}
