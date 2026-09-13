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
  document: contentDocument,
  organizationId,
  onSelectionChange,
}: ContentDetailMainDocumentProps) {
  const {
    briefStatus,
    editedMarkdown,
    editedMarkdownRef,
    editorKey,
    editorRef,
    geoWriterBriefQuery,
    geoWriterDraft,
    handleEditorChange,
    handlePlanBriefChange,
    hasChanges,
    hasMarkdownChanges,
    hasPlanConflict,
    hasSlugChanges,
    hasTitleChanges,
    imageExportRef,
    isGeoWriterPlanMode,
    isGeoWriterPlanReviewableNow,
    originalMarkdown,
    planEditorVersion,
    resolvePlanConflictLoadLatest,
    resolvePlanConflictSaveMine,
    reviewPreviousMarkdown,
    setEditedMarkdown,
    setEditingSlug,
    setEditingTitle,
    setIsPlanDirty,
    setOriginalMarkdown,
    editingSlug,
    editingTitle,
    serverSlug,
    serverTitle,
    writeFocusNonce,
  } = contentDocument;
  const { activeOrganization } = useOrganizationsContext();
  const content = data.content;
  const planBrief = geoWriterBriefQuery.data?.brief;

  if (isGeoWriterPlanMode && planBrief) {
    return (
      <>
        {hasPlanConflict ? (
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
                onClick={resolvePlanConflictLoadLatest}
                size="sm"
                variant="outline"
              >
                Load latest
              </Button>
              <Button onClick={resolvePlanConflictSaveMine} size="sm">
                Save my version
              </Button>
            </div>
          </div>
        ) : null}
        <ContentPlanView
          brief={planBrief}
          isWriting={briefStatus === "writing" || briefStatus === "approved"}
          key={`${geoWriterDraft?.briefId ?? contentId}:${planEditorVersion}`}
          onChange={
            isGeoWriterPlanReviewableNow && !hasPlanConflict
              ? handlePlanBriefChange
              : undefined
          }
          onDirtyChange={
            isGeoWriterPlanReviewableNow ? setIsPlanDirty : undefined
          }
        />
      </>
    );
  }

  if (isGeoWriterPlanMode) {
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
          setEditedMarkdown(markdown);
          if (markdown !== null) {
            editedMarkdownRef.current = markdown;
          }
        },
        setOriginalMarkdown,
        setEditingTitle,
        setEditingSlug,
        onEditorChange: handleEditorChange,
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
      editorKey={editorKey}
      editorRef={editorRef}
      imageExportRef={imageExportRef}
      organization={{
        name: activeOrganization?.name ?? "Your Organization",
        logo: activeOrganization?.logo ?? null,
      }}
      organizationId={organizationId}
      readOnly={false}
      reviewPreviousMarkdown={reviewPreviousMarkdown}
      state={{
        editedMarkdown,
        originalMarkdown,
        editingTitle,
        serverTitle,
        editingSlug,
        serverSlug,
        hasChanges,
        hasMarkdownChanges,
        hasTitleChanges,
        hasSlugChanges,
      }}
      writeFocusNonce={writeFocusNonce}
    />
  );
}
