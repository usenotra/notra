import type { ReactNode } from "react";

import type { ContentChatActivityPanelProps } from "@/types/components/content-chat-activity-panel";

export interface ContentAgentPanelProps extends ContentChatActivityPanelProps {
  isOpen: boolean;
  hasOpened: boolean;
}

export interface ContentComposerDockProps {
  children: ReactNode;
  isPanelOpen: boolean;
  sidebarState: "expanded" | "collapsed";
}

export interface ContentSaveBarProps {
  hasChanges: boolean;
  isPanelOpen: boolean;
  sidebarState: "expanded" | "collapsed";
  onSave: () => Promise<boolean>;
  onDiscard: () => void;
}

export interface ContentBackLinkProps {
  organizationSlug: string;
  collectionId: string | undefined;
}
