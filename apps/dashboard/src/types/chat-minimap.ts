export interface ChatMinimapTurn {
  description?: string;
  id: string;
  messageIds: string[];
  title: string;
}

export interface ChatMinimapRailProps {
  className?: string;
  turns: ChatMinimapTurn[];
}
