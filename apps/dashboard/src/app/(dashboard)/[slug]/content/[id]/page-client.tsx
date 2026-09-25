"use client";

import { ChatQuoteProvider } from "@/components/chat/chat-quote";
import {
  ContentDetailChatPanel,
  ContentDetailFloatingChat,
} from "@/components/content/content-detail-chat-shell";
import { ContentDetailLoadedView } from "@/components/content/content-detail-loaded-view";
import { ContentDetailNotFound } from "@/components/content/content-detail-not-found";
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

  const floatingChat = (
    <ContentDetailFloatingChat {...chat.floatingChatProps} />
  );

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
      chatInputSection={
        <ChatQuoteProvider key={chat.chatPanelProps.activeChatId}>
          {floatingChat}
          <ContentDetailChatPanel {...chat.chatPanelProps} />
        </ChatQuoteProvider>
      }
      contentId={contentId}
      data={data}
      document={document}
      onSelectionChange={chat.handleSelectionChange}
      organizationId={organizationId}
      organizationSlug={organizationSlug}
      selectedExcerpt={chat.selection}
    />
  );
}
