import type { ReactNode } from "react";

export type RightPanelId = "agent" | "content" | "preview";

export interface RightPanelContextValue {
  active: RightPanelId | null;
  expanded: boolean;
  hasOpened: Record<RightPanelId, boolean>;
  openPanel: (id: RightPanelId) => void;
  closePanel: (id?: RightPanelId) => void;
  togglePanel: (id: RightPanelId) => void;
  toggleExpanded: () => void;
}

export interface RightPanelProps {
  id: RightPanelId;
  children: ReactNode;
  /** `wide` docks at reading width for document previews. */
  size?: "default" | "wide";
}
