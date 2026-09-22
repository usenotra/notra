"use client";

import type { TextSelection } from "@notra/ai/types/chat";
import type { ReactNode } from "react";

import { ContentDetailMainDocument } from "@/components/content/content-detail-main-document";
import { ContentDetailSourceMetadata } from "@/components/content/content-detail-source-metadata";
import { ContentDetailToolbar } from "@/components/content/content-detail-toolbar";
import { RecommendationsSection } from "@/components/content/recommendations-section";
import { WriterExecute } from "@/components/geo/writer/writer-execute";
import type { ContentDetailDocument } from "@/lib/hooks/use-content-detail-document";
import type { ContentApiResponse } from "@/types/hooks/content";

interface ContentDetailLoadedViewProps {
  contentId: string;
  organizationId: string;
  organizationSlug: string;
  data: ContentApiResponse;
  document: ContentDetailDocument;
  onSelectionChange: (selection: TextSelection | null) => void;
  selectedExcerpt: TextSelection | null;
  rightPanelSection: ReactNode;
  chatInputSection: ReactNode;
}

export function ContentDetailLoadedView({
  contentId,
  organizationId,
  organizationSlug,
  data,
  document,
  onSelectionChange,
  selectedExcerpt,
  rightPanelSection,
  chatInputSection,
}: ContentDetailLoadedViewProps) {
  const content = data.content;
  const isLongForm = ["blog_post", "changelog"].includes(content.contentType);

  return (
    <>
      <WriterExecute.Root
        briefId={document.geoWriterDraft?.briefId ?? null}
        hasUnsavedChanges={
          document.isGeoWriterPlanMode
            ? document.isPlanDirty || document.geoWriterUpdate.isPending
            : document.hasChanges
        }
        onArticleReady={document.handleGeoArticleReady}
        organizationId={organizationId}
      >
        <ContentDetailToolbar
          content={content}
          contentId={contentId}
          document={document}
          organizationId={organizationId}
          organizationSlug={organizationSlug}
        />
        <div className="flex flex-1 flex-col py-4 md:py-6">
          <div
            className={`mx-auto w-full space-y-6 px-4 lg:px-6 ${isLongForm ? "max-w-3xl" : "max-w-5xl"}`}
          >
            {document.geoWriterDraft ? <WriterExecute.Banner /> : null}
            {!isLongForm ? (
              <ContentDetailSourceMetadata
                organizationId={organizationId}
                sourceMetadata={content.sourceMetadata}
              />
            ) : null}

            <ContentDetailMainDocument
              contentId={contentId}
              data={data}
              document={document}
              onSelectionChange={onSelectionChange}
              organizationId={organizationId}
              selectedExcerpt={selectedExcerpt}
            />

            {document.isGeoWriterPlanMode ? null : (
              <RecommendationsSection value={content.recommendations} />
            )}

            <div className="h-24" />
          </div>
        </div>
      </WriterExecute.Root>
      {rightPanelSection}
      {chatInputSection}
    </>
  );
}
