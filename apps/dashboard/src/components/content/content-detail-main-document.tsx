"use client";

import type { TextSelection } from "@notra/ai/types/chat";
import { Button } from "@notra/ui/components/ui/button";
import { Skeleton } from "@notra/ui/components/ui/skeleton";

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
  selectedExcerpt: TextSelection | null;
}

function GeoWriterPlanDocument({
  contentId,
  document,
}: Pick<ContentDetailMainDocumentProps, "contentId" | "document">) {
  const {
    briefStatus,
    geoWriterBriefQuery,
    geoWriterDraft,
    handlePlanBriefChange,
    hasPlanConflict,
    isGeoWriterBriefError,
    isGeoWriterBriefMissing,
    isGeoWriterPlanReviewableNow,
    planEditorVersion,
    resolvePlanConflictLoadLatest,
    resolvePlanConflictSaveMine,
    setIsPlanDirty,
  } = document;
  const planBrief = geoWriterBriefQuery.data?.brief;

  if (planBrief) {
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

  if (isGeoWriterBriefMissing) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-1 py-12 text-center">
        <p className="font-medium">This content plan no longer exists</p>
        <p className="text-muted-foreground text-sm">
          Start a new plan from GEO to write this article.
        </p>
      </div>
    );
  }

  if (isGeoWriterBriefError) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 py-12 text-center">
        <div>
          <p className="font-medium">Could not load this content plan</p>
          <p className="text-muted-foreground text-sm">
            Try again to continue reviewing or generating this content.
          </p>
        </div>
        <Button
          disabled={geoWriterBriefQuery.isFetching}
          onClick={() => {
            void geoWriterBriefQuery.refetch();
          }}
          size="sm"
          variant="outline"
        >
          {geoWriterBriefQuery.isFetching ? "Trying again…" : "Try again"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Skeleton className="bg-muted/60 h-4 w-24 rounded-sm" />
      <Skeleton className="bg-muted/60 h-10 w-3/4 rounded-sm" />
      <Skeleton className="bg-muted/60 h-16 w-full rounded-sm" />
      <Skeleton className="bg-muted/60 h-40 w-full rounded-sm" />
    </div>
  );
}

export function ContentDetailMainDocument({
  contentId,
  data,
  document: contentDocument,
  organizationId,
  onSelectionChange,
  selectedExcerpt,
}: ContentDetailMainDocumentProps) {
  const {
    editedMarkdown,
    editedMarkdownRef,
    editorKey,
    editorRef,
    handleEditorChange,
    hasChanges,
    hasMarkdownChanges,
    hasSlugChanges,
    hasTitleChanges,
    imageExportRef,
    isGeoWriterPlanMode,
    originalMarkdown,
    reviewPreviousMarkdown,
    setEditedMarkdown,
    setEditingSlug,
    setEditingTitle,
    setOriginalMarkdown,
    editingSlug,
    editingTitle,
    serverSlug,
    serverTitle,
    writeFocusNonce,
  } = contentDocument;
  const { activeOrganization } = useOrganizationsContext();
  const content = data.content;

  if (contentDocument.isGeoArticleLoading) {
    return (
      <div className="space-y-6" role="status">
        <span className="sr-only">Loading article</span>
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isGeoWriterPlanMode) {
    return (
      <GeoWriterPlanDocument contentId={contentId} document={contentDocument} />
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
        selectedExcerpt,
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
