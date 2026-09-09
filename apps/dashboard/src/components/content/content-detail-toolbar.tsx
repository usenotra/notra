import { SentIcon, TextIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import { Button } from "@notra/ui/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { getContentTypeLabel } from "@/components/content/content-card";
import { ContentSourceMetadata } from "@/components/content/content-source-metadata";
import { ImageExportActions } from "@/components/content/image-export-actions";
import { PostSocialButton } from "@/components/content/post-social-button";
import { PublishContentToGitHubDialog } from "@/components/content/publish-content-to-github-dialog";
import { WriterExecute } from "@/components/geo/writer/writer-execute";
import { CONTENT_PLAN_STAGE_LABEL } from "@/constants/content-plan";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { ContentDetailToolbarProps } from "@/types/content/detail-toolbar";

const fullDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

function formatDate(date: Date): string {
  return fullDateFormatter.format(date);
}

function ContentMetadata({
  content,
  isPlanMode,
  voices,
}: Pick<ContentDetailToolbarProps, "content" | "isPlanMode" | "voices">) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      {content.contentType === "blog_post" ? (
        <p className="text-muted-foreground text-sm">
          {isPlanMode ? CONTENT_PLAN_STAGE_LABEL : "Blog post"}
          {content.status === "draft" && !isPlanMode ? (
            <>
              {" \u00B7 "}
              Draft
            </>
          ) : null}
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <time
            className="text-muted-foreground text-sm"
            dateTime={content.date}
          >
            {formatDate(new Date(content.date))}
          </time>
          <Badge className="capitalize" variant="secondary">
            {getContentTypeLabel(content.contentType)}
          </Badge>
          {content.contentType !== "image" ? (
            <Badge
              className="capitalize"
              variant={content.status === "published" ? "default" : "outline"}
            >
              {content.status}
            </Badge>
          ) : null}
        </div>
      )}
      <ContentSourceMetadata
        metadata={content.sourceMetadata}
        voices={voices}
      />
    </div>
  );
}

function PublishStatusButton({
  content,
  organizationId,
}: Pick<ContentDetailToolbarProps, "content" | "organizationId">) {
  const queryClient = useQueryClient();
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const isPublished = content.status === "published";
  let label = isPublished ? "Move to draft" : "Publish";
  if (isTogglingStatus) {
    label = "Updating...";
  }

  const handleToggleStatus = useCallback(async () => {
    setIsTogglingStatus(true);
    const status = isPublished ? "draft" : "published";
    const successMessage =
      status === "published" ? "Post published" : "Post moved to drafts";
    try {
      await dashboardOrpc.content.update.call({
        organizationId,
        contentId: content.id,
        status,
      });
      toast.success(successMessage);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.get.queryKey({
            input: { organizationId, contentId: content.id },
          }),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.list.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.collections.list.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.collections.get.key(),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.metrics.get.queryKey({
            input: { organizationId },
          }),
        }),
      ]);
    } catch {
      toast.error("Failed to update post status");
    }
    setIsTogglingStatus(false);
  }, [content.id, isPublished, organizationId, queryClient]);

  return (
    <Button
      disabled={isTogglingStatus}
      onClick={handleToggleStatus}
      size="sm"
      variant={content.status === "draft" ? "default" : "outline"}
    >
      {label}
      <HugeiconsIcon
        className="size-4"
        icon={isPublished ? TextIcon : SentIcon}
      />
    </Button>
  );
}

function ContentActions(props: ContentDetailToolbarProps) {
  const { content, document, isPlanMode } = props;
  return (
    <div className="ml-auto flex shrink-0 items-center gap-2">
      {(content.contentType === "changelog" ||
        content.contentType === "blog_post") &&
      document.currentMarkdown.trim() !== "" ? (
        <PublishContentToGitHubDialog
          contentId={content.id}
          contentType={content.contentType}
          onSave={document.save}
          organizationId={props.organizationId}
          organizationSlug={props.organizationSlug}
          title={document.title}
        />
      ) : null}
      {isPlanMode ? <WriterExecute.Button /> : null}
      {content.contentType !== "image" && !isPlanMode ? (
        <PublishStatusButton
          content={content}
          organizationId={props.organizationId}
        />
      ) : null}
      {content.contentType === "linkedin_post" ? (
        <PostSocialButton
          content={document.currentMarkdown}
          from="editor"
          onContentChange={document.setEditedMarkdown}
          organizationId={props.organizationId}
          platform="linkedin"
        />
      ) : null}
      {content.contentType === "twitter_post" ? (
        <PostSocialButton
          content={document.currentMarkdown}
          from="editor"
          onContentChange={document.setEditedMarkdown}
          organizationId={props.organizationId}
          platform="twitter"
        />
      ) : null}
      {content.contentType === "image" ? (
        <ImageExportActions
          content={content}
          exportRef={props.imageExportRef}
          title={document.title}
        />
      ) : null}
    </div>
  );
}

export function ContentDetailToolbar(props: ContentDetailToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <ContentMetadata
        content={props.content}
        isPlanMode={props.isPlanMode}
        voices={props.voices}
      />
      <ContentActions {...props} />
    </div>
  );
}
