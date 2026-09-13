"use client";

import {
  ContentDetailChatPanel,
  ContentDetailFloatingChat,
} from "@/components/content/content-detail-chat-shell";
import { ContentDetailLoadedView } from "@/components/content/content-detail-loaded-view";
import { ContentDetailNotFound } from "@/components/content/content-detail-not-found";
import { ContentDetailSaveBar } from "@/components/content/content-detail-save-bar";
import { useRightPanel } from "@/components/dashboard/right-panel-context";
import { useContentDetailChat } from "@/lib/hooks/use-content-detail-chat";
import { useContentDetailDocument } from "@/lib/hooks/use-content-detail-document";
import type { ContentDetailPageClientProps } from "@/types/content/detail";

import { useContent } from "../../../../../lib/hooks/use-content";
import { ContentDetailSkeleton } from "./skeleton";

export default function PageClient({
  contentId,
  organizationSlug,
  organizationId,
}: ContentDetailPageClientProps) {
  const { data, isPending, error } = useContent(organizationId, contentId);
  const document = useContentDetailDocument({
    organizationId,
    contentId,
    data,
  });
  const chat = useContentDetailChat({
    organizationId,
    organizationSlug,
    contentId,
    content: data?.content,
    contentDocument: document,
  });
  const { active, togglePanel } = useRightPanel();
  const isActivityPanelOpen = active === "content";

  const floatingChat = (
    <ContentDetailFloatingChat {...chat.floatingChatProps} />
  );
  const saveBar = document.saveBarProps ? (
    <ContentDetailSaveBar {...document.saveBarProps} />
  ) : null;

  if (isPending) {
    return (
      <>
        <ContentDetailSkeleton />
        {floatingChat}
      </>
    );
  }

  if (error || !data?.content) {
    return (
      <>
        <ContentDetailNotFound organizationSlug={organizationSlug} />
        {floatingChat}
      </>
    );
  }

  return (
    <ContentDetailLoadedView
      chatInputSection={floatingChat}
      contentId={contentId}
      data={data}
      document={document}
      isActivityPanelOpen={isActivityPanelOpen}
      onSelectionChange={chat.handleSelectionChange}
      onToggleActivityPanel={() => togglePanel("content")}
      organizationId={organizationId}
      organizationSlug={organizationSlug}
      rightPanelSection={<ContentDetailChatPanel {...chat.chatPanelProps} />}
      saveBarSection={saveBar}
    />
  );
}
