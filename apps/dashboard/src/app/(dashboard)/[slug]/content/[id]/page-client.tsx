"use client";

import {
  ContentDetailChatPanel,
  ContentDetailFloatingChat,
} from "@/components/content/content-detail-chat-shell";
import { ContentDetailLoadedView } from "@/components/content/content-detail-loaded-view";
import { ContentDetailNotFound } from "@/components/content/content-detail-not-found";
import { GeoProjectProvider } from "@/components/providers/geo-project-provider";
import { useContentDetailChat } from "@/lib/hooks/use-content-detail-chat";
import { useContentDetailDocument } from "@/lib/hooks/use-content-detail-document";
import type { ContentDetailPageClientProps } from "@/types/content/detail";
import { parseGeoWriterDraft } from "@/utils/geo-write-entry";

import { useContent } from "../../../../../lib/hooks/use-content";
import { ContentDetailSkeleton } from "./skeleton";

export default function PageClient(props: ContentDetailPageClientProps) {
  const { data } = useContent(props.organizationId, props.contentId);
  const draft = parseGeoWriterDraft(data?.content.sourceMetadata);

  return (
    <GeoProjectProvider projectId={draft?.projectId}>
      <ContentDetailPage {...props} />
    </GeoProjectProvider>
  );
}

function ContentDetailPage({
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
      chatInputSection={floatingChat}
      contentId={contentId}
      data={data}
      document={document}
      onSelectionChange={chat.handleSelectionChange}
      organizationId={organizationId}
      organizationSlug={organizationSlug}
      rightPanelSection={<ContentDetailChatPanel {...chat.chatPanelProps} />}
      selectedExcerpt={chat.selection}
    />
  );
}
