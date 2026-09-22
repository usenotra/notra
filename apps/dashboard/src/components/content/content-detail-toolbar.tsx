"use client";

import {
  ArrowTurnBackwardIcon,
  Download01Icon,
  SentIcon,
  TextIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Github } from "@notra/ui/components/ui/svgs/github";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { createPortal } from "react-dom";

import { Button } from "@/components/button";
import { ImageExportTargetIcon } from "@/components/content/image-export-target-icon";
import { PostSocialButton } from "@/components/content/post-social-button";
import { PublishContentToGitHubDialog } from "@/components/content/publish-content-to-github-dialog";
import { WriterExecute } from "@/components/geo/writer/writer-execute";
import { IMAGE_EXPORT_TARGETS } from "@/constants/image-export";
import { IMAGE_EXPORT_DOWNLOAD_TARGET } from "@/constants/studio-analytics";
import { trackEvent } from "@/lib/analytics/posthog-client";
import {
  copyImageAsFigma,
  copyImageAsPaper,
  downloadImage,
  preloadImageExportCopy,
} from "@/lib/content/image-export";
import { cn } from "@/lib/utils";
import type {
  ContentDetailToolbarProps,
  ContentDetailImageActionsProps,
} from "@/types/components/content-detail-toolbar";
import type { ImageExportTarget } from "@/types/content/image-export";
import { getPublishButtonLabel } from "@/utils/content-detail";
import { useContentEditorHeaderSlot } from "@/utils/content-editor-header-slot";
import { getImageExportHtml, isHttpImageContent } from "@/utils/image-content";
import {
  getImageExportTargetLabel,
  isImageExportTarget,
} from "@/utils/image-export";

function ContentDetailImageActions({
  content,
  contentId,
  document,
}: ContentDetailImageActionsProps) {
  const imageExportHtml = getImageExportHtml(content);
  const imageExportHtmlUrl = content.htmlUrl;
  const imageDownloadUrl = isHttpImageContent(content.content)
    ? content.content
    : null;
  const copyImageExportFor = (target: ImageExportTarget) => {
    trackEvent(POSTHOG_EVENTS.IMAGE_EXPORTED, {
      content_id: contentId,
      target,
    });
    if (target === "figma") {
      copyImageAsFigma(
        document.imageExportRef.current,
        document.title,
        imageExportHtml,
        imageExportHtmlUrl
      );
      return;
    }

    copyImageAsPaper(
      document.imageExportRef.current,
      document.title,
      imageExportHtml,
      imageExportHtmlUrl
    );
  };

  const handleImageExportTargetSelect = (value: string) => {
    if (!isImageExportTarget(value) || value === "wonder") {
      return;
    }
    document.handleImageExportTargetSelect(value);
    preloadImageExportCopy(value);
    copyImageExportFor(value);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            onFocusCapture={() =>
              preloadImageExportCopy(document.imageExportTarget)
            }
            onMouseEnter={() =>
              preloadImageExportCopy(document.imageExportTarget)
            }
            size="sm"
            variant="outline"
          />
        }
      >
        <HugeiconsIcon className="size-4" icon={Download01Icon} />
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          onClick={() => {
            trackEvent(POSTHOG_EVENTS.IMAGE_EXPORTED, {
              content_id: contentId,
              target: IMAGE_EXPORT_DOWNLOAD_TARGET,
            });
            downloadImage(imageDownloadUrl, document.title);
          }}
        >
          <HugeiconsIcon className="size-4" icon={Download01Icon} />
          Download image
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {IMAGE_EXPORT_TARGETS.map((target) => {
          const isWonder = target === "wonder";

          return (
            <DropdownMenuItem
              className={cn(isWonder && "items-start")}
              disabled={isWonder}
              key={target}
              onClick={() => {
                if (isWonder) {
                  return;
                }
                handleImageExportTargetSelect(target);
              }}
              onFocus={() => preloadImageExportCopy(target)}
              onMouseEnter={() => preloadImageExportCopy(target)}
            >
              <ImageExportTargetIcon
                className="mt-0.5 size-4"
                target={target}
              />
              <span className="flex flex-col">
                <span>Copy for {getImageExportTargetLabel(target)}</span>
                {isWonder ? (
                  <span className="text-muted-foreground text-xs">
                    Coming soon
                  </span>
                ) : null}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ContentDetailPublishActions({
  content,
  contentId,
  document,
  organizationId,
  organizationSlug,
}: ContentDetailToolbarProps) {
  if (document.isGeoWriterPlanMode) {
    return <WriterExecute.Button />;
  }
  const githubPublish = content.githubPublish;
  return (
    <>
      {(content.contentType === "changelog" ||
        content.contentType === "blog_post") &&
      githubPublish ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                nativeButton={false}
                render={
                  <a
                    href={githubPublish.pullRequestUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  />
                }
                size="sm"
                variant="outline"
              />
            }
          >
            <Github className="size-4" />
            <span className="tabular-nums">
              #{githubPublish.pullRequestNumber}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {githubPublish.owner}/{githubPublish.repo} #
            {githubPublish.pullRequestNumber}
          </TooltipContent>
        </Tooltip>
      ) : null}
      {(content.contentType === "changelog" ||
        content.contentType === "blog_post") &&
      !githubPublish &&
      !document.isGeoArticleLoading &&
      document.currentMarkdown.trim() !== "" ? (
        <PublishContentToGitHubDialog
          contentId={contentId}
          contentType={content.contentType}
          githubPublish={null}
          key={organizationId}
          onSave={document.handleSave}
          organizationId={organizationId}
          organizationSlug={organizationSlug}
          title={document.title}
        />
      ) : null}
      <Button
        disabled={
          document.isTogglingStatus ||
          document.isGeoArticleLoading ||
          document.hasChanges ||
          document.isSaving
        }
        onClick={document.handleToggleStatus}
        size="sm"
        variant={content.status === "draft" ? "default" : "outline"}
      >
        {getPublishButtonLabel(document.isTogglingStatus, content.status)}
        <HugeiconsIcon
          className="size-4"
          icon={content.status === "published" ? TextIcon : SentIcon}
        />
      </Button>
    </>
  );
}

function ContentDetailSaveActions({
  document,
  updatesLinkedPullRequest,
}: Pick<ContentDetailToolbarProps, "document"> & {
  updatesLinkedPullRequest: boolean;
}) {
  if (
    !(
      document.hasChanges &&
      (updatesLinkedPullRequest ||
        document.saveFailed ||
        document.reviewPreviousMarkdown)
    )
  ) {
    return null;
  }

  let saveLabel = "Save";
  if (updatesLinkedPullRequest) {
    saveLabel = document.isSaving ? "Updating PR" : "Update PR";
  } else if (document.isSaving) {
    saveLabel = "Saving";
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label="Discard"
              disabled={document.isSaving}
              onClick={document.handleDiscard}
              size="icon-sm"
              variant="ghost"
            />
          }
        >
          <HugeiconsIcon className="size-4" icon={ArrowTurnBackwardIcon} />
        </TooltipTrigger>
        <TooltipContent>Discard</TooltipContent>
      </Tooltip>
      <Button
        aria-keyshortcuts="Meta+S Control+S"
        data-save-bar
        disabled={document.isSaving}
        onClick={() => {
          void document.handleSave();
        }}
        size="sm"
        variant="outline"
      >
        {saveLabel}
      </Button>
    </>
  );
}

export function ContentDetailToolbar(props: ContentDetailToolbarProps) {
  const { content, document, organizationId } = props;
  const headerSlot = useContentEditorHeaderSlot();
  const updatesLinkedPullRequest = Boolean(content.githubPublish);
  const actions = (
    <>
      <ContentDetailSaveActions
        document={document}
        updatesLinkedPullRequest={updatesLinkedPullRequest}
      />
      {content.contentType === "image" ? (
        <ContentDetailImageActions {...props} />
      ) : (
        <ContentDetailPublishActions {...props} />
      )}
      {content.contentType === "linkedin_post" ||
      content.contentType === "twitter_post" ? (
        <PostSocialButton
          content={document.currentMarkdown}
          from="editor"
          onContentChange={document.setEditedMarkdown}
          organizationId={organizationId}
          platform={
            content.contentType === "linkedin_post" ? "linkedin" : "twitter"
          }
        />
      ) : null}
    </>
  );

  if (!headerSlot) {
    return null;
  }

  return createPortal(actions, headerSlot);
}
