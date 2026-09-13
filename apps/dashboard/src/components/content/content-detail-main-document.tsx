"use client";

import type { TextSelection } from "@notra/ai/types/chat";
import { Button } from "@notra/ui/components/ui/button";

import { ContentPlanView } from "@/components/content/content-plan-view";
import { ContentEditorSwitch } from "@/components/content/editors";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import type { ContentDetailDocument } from "@/lib/hooks/use-content-detail-document";
import type { ContentApiResponse } from "@/types/hooks/content";

interface ContentDetailMainDocumentProps {
  contentId: string;
  data: ContentApiResponse;
  document: ContentDetailDocument;
  organizationId: string;
  onSelectionChange: (selection: TextSelection | null) => void;
}

export function ContentDetailMainDocument({
  contentId,
  data,
  document,
  organizationId,
  onSelectionChange,
}: ContentDetailMainDocumentProps) {
  const { activeOrganization } = useOrganizationsContext();
  const content = data.content;
  const planBrief = document.geoWriterBriefQuery.data?.brief;

  if (document.isGeoWriterPlanMode && planBrief) {
    return (
      <>
        {document.hasPlanConflict ? (
          <div
            className="border-border bg-muted/50 mx-auto mb-6 flex w-full max-w-3xl flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            role="alert"
          >
            <div>
              <p className="text-sm font-medium">This plan changed elsewhere</p>
              <p className="text-muted-foreground text-sm">
                Your edits are preserved. Choose which version to keep.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                onClick={document.resolvePlanConflictLoadLatest}
                size="sm"
                variant="outline"
              >
                Load latest
              </Button>
              <Button onClick={document.resolvePlanConflictSaveMine} size="sm">
                Save my version
              </Button>
            </div>
          </div>
        ) : null}
        <ContentPlanView
          brief={planBrief}
          isWriting={
            document.briefStatus === "writing" ||
            document.briefStatus === "approved"
          }
          key={`${document.geoWriterDraft?.briefId ?? contentId}:${document.planEditorVersion}`}
          onChange={
            document.isGeoWriterPlanReviewableNow && !document.hasPlanConflict
              ? document.handlePlanBriefChange
              : undefined
          }
          onDirtyChange={
            document.isGeoWriterPlanReviewableNow
              ? document.setIsPlanDirty
              : undefined
          }
        />
      </>
    );
  }

  if (document.isGeoWriterPlanMode) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="bg-muted/60 h-4 w-24 animate-pulse rounded-sm" />
        <div className="bg-muted/60 h-10 w-3/4 animate-pulse rounded-sm" />
        <div className="bg-muted/60 h-16 w-full animate-pulse rounded-sm" />
        <div className="bg-muted/60 h-40 w-full animate-pulse rounded-sm" />
      </div>
    );
  }

  return (
    <ContentEditorSwitch
      actions={{
        setEditedMarkdown: (markdown) => {
          document.setEditedMarkdown(markdown);
          if (markdown !== null) {
            document.editedMarkdownRef.current = markdown;
          }
        },
        setOriginalMarkdown: document.setOriginalMarkdown,
        setEditingTitle: document.setEditingTitle,
        setEditingSlug: document.setEditingSlug,
        onEditorChange: document.handleEditorChange,
        onSelectionChange,
      }}
      content={{
        id: content.id,
        title: content.title,
        slug: content.slug,
        content: content.content,
        htmlUrl: content.htmlUrl,
        rawHtml: content.rawHtml,
        markdown: content.markdown,
        contentType: content.contentType,
        date: content.date,
        status: content.status,
        sourceMetadata: content.sourceMetadata,
      }}
      contentType={content.contentType}
      editorKey={document.editorKey}
      editorRef={document.editorRef}
      imageExportRef={document.imageExportRef}
      organization={{
        name: activeOrganization?.name ?? "Your Organization",
        logo: activeOrganization?.logo ?? null,
      }}
      organizationId={organizationId}
      readOnly={false}
      reviewPreviousMarkdown={document.reviewPreviousMarkdown}
      state={{
        editedMarkdown: document.editedMarkdown,
        originalMarkdown: document.originalMarkdown,
        editingTitle: document.editingTitle,
        serverTitle: document.serverTitle,
        editingSlug: document.editingSlug,
        serverSlug: document.serverSlug,
        hasChanges: document.hasChanges,
        hasMarkdownChanges: document.hasMarkdownChanges,
        hasTitleChanges: document.hasTitleChanges,
        hasSlugChanges: document.hasSlugChanges,
      }}
      writeFocusNonce={document.writeFocusNonce}
    />
  );
}
