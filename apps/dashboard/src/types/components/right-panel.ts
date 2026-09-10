import type { ReactNode, TransitionEvent } from "react";

export type RightPanelId = "agent" | "content";

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
}

export interface RightPanelSlide {
  slotOpen: boolean;
  entered: boolean;
  onFrameTransitionEnd: (event: TransitionEvent<HTMLDivElement>) => void;
}
