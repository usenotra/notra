"use client";

import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TextSelection } from "@notra/ai/types/chat";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import Link from "next/link";
import type { ReactNode } from "react";

import { ContentDetailMainDocument } from "@/components/content/content-detail-main-document";
import { ContentDetailSourceMetadata } from "@/components/content/content-detail-source-metadata";
import { ContentDetailToolbar } from "@/components/content/content-detail-toolbar";
import { RecommendationsSection } from "@/components/content/recommendations-section";
import { WriterExecute } from "@/components/geo/writer/writer-execute";
import type { ContentDetailDocument } from "@/lib/hooks/use-content-detail-document";
import type { ContentApiResponse } from "@/types/hooks/content";
import { getImageExportHtml, isHttpImageContent } from "@/utils/image-content";

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
  const imageExportHtml =
    content.contentType === "image" ? getImageExportHtml(content) : null;
  const imageExportHtmlUrl =
    content.contentType === "image" ? content.htmlUrl : null;
  const imageDownloadUrl =
    content.contentType === "image" && isHttpImageContent(content.content)
      ? content.content
      : null;
  const collection = data.collection;
  const backHref = collection
    ? `/${organizationSlug}/collection/${collection.id}`
    : `/${organizationSlug}/content`;
  const backLabel = collection ? "Back to collection" : "Back to Content";

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
        <div className="bg-secondary sticky top-0 z-20 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 lg:px-6">
          <div
            aria-hidden="true"
            className="bg-secondary pointer-events-none absolute inset-x-0 top-full h-4"
          >
            <div className="bg-background h-full rounded-t-2xl" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    aria-label={backLabel}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring inline-flex min-h-8 shrink-0 items-center gap-2 rounded-md px-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    href={backHref}
                  />
                }
              >
                <HugeiconsIcon className="size-4" icon={ArrowLeft02Icon} />
                {backLabel}
              </TooltipTrigger>
              <TooltipContent>{backLabel}</TooltipContent>
            </Tooltip>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <ContentDetailToolbar
              content={content}
              contentId={contentId}
              document={document}
              imageDownloadUrl={imageDownloadUrl}
              imageExportHtml={imageExportHtml}
              imageExportHtmlUrl={imageExportHtmlUrl}
              organizationId={organizationId}
              organizationSlug={organizationSlug}
            />
          </div>
        </div>
        <div className="flex flex-1 flex-col py-4 md:py-6">
          <div
            className={`mx-auto w-full space-y-6 px-4 lg:px-6 ${content.contentType === "blog_post" || content.contentType === "changelog" ? "max-w-3xl" : "max-w-5xl"}`}
          >
            {document.geoWriterDraft ? <WriterExecute.Banner /> : null}
            {content.contentType !== "blog_post" &&
            content.contentType !== "changelog" ? (
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
