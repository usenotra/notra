"use client";

import {
  ArrowLeft02Icon,
  SidebarRight01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TextSelection } from "@notra/ai/types/chat";
import { Button } from "@notra/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import Link from "next/link";
import type { ReactNode } from "react";

import { ContentDetailHeaderMeta } from "@/components/content/content-detail-header-meta";
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
  saveBarSection: ReactNode;
  chatInputSection: ReactNode;
  isActivityPanelOpen: boolean;
  onToggleActivityPanel: () => void;
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
  saveBarSection,
  chatInputSection,
  isActivityPanelOpen,
  onToggleActivityPanel,
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
      <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="mx-auto w-full max-w-5xl space-y-6 px-4 lg:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex w-fit items-center gap-1.5 rounded-sm text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
              href={backHref}
            >
              <HugeiconsIcon className="size-4" icon={ArrowLeft02Icon} />
              {backLabel}
            </Link>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    className="hidden lg:inline-flex"
                    onClick={onToggleActivityPanel}
                    size="icon-sm"
                    variant={isActivityPanelOpen ? "secondary" : "outline"}
                  />
                }
              >
                <span className="sr-only">Toggle Content Agent</span>
                <HugeiconsIcon className="size-4" icon={SidebarRight01Icon} />
              </TooltipTrigger>
              <TooltipContent>Content Agent</TooltipContent>
            </Tooltip>
          </div>
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
            {document.geoWriterDraft ? <WriterExecute.Banner /> : null}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <ContentDetailHeaderMeta
                  content={content}
                  isGeoWriterPlanMode={document.isGeoWriterPlanMode}
                />
                <ContentDetailSourceMetadata
                  organizationId={organizationId}
                  sourceMetadata={content.sourceMetadata}
                />
              </div>
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
          </WriterExecute.Root>

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
      {rightPanelSection}
      {saveBarSection}
      {chatInputSection}
    </>
  );
}
