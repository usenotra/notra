"use client";

import {
  ArrowDown01Icon,
  Download01Icon,
  SentIcon,
  TextIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { ButtonGroup } from "@notra/ui/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Github } from "@notra/ui/components/ui/svgs/github";

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
  };

  return (
    <>
      <Button
        onClick={() => {
          trackEvent(POSTHOG_EVENTS.IMAGE_EXPORTED, {
            content_id: contentId,
            target: IMAGE_EXPORT_DOWNLOAD_TARGET,
          });
          downloadImage(imageDownloadUrl, document.title);
        }}
        size="sm"
        variant="outline"
      >
        <HugeiconsIcon className="size-4" icon={Download01Icon} />
        Download image
      </Button>
      <ButtonGroup
        onFocusCapture={() =>
          preloadImageExportCopy(document.imageExportTarget)
        }
        onMouseEnter={() => preloadImageExportCopy(document.imageExportTarget)}
      >
        <Button
          onClick={() => copyImageExportFor(document.imageExportTarget)}
          size="sm"
          variant="outline"
        >
          <ImageExportTargetIcon
            className="size-4"
            target={document.imageExportTarget}
          />
          Copy for {getImageExportTargetLabel(document.imageExportTarget)}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button size="icon-sm" variant="outline" />}
          >
            <span className="sr-only">Select export target</span>
            <HugeiconsIcon className="size-4" icon={ArrowDown01Icon} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuRadioGroup
              onValueChange={handleImageExportTargetSelect}
              value={document.imageExportTarget}
            >
              {IMAGE_EXPORT_TARGETS.map((target) => {
                const isWonder = target === "wonder";

                return (
                  <DropdownMenuRadioItem
                    className={cn("gap-2", isWonder && "items-start")}
                    closeOnClick
                    disabled={isWonder}
                    key={target}
                    onFocus={() => preloadImageExportCopy(target)}
                    onMouseEnter={() => preloadImageExportCopy(target)}
                    value={target}
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
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
    </>
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
  return (
    <>
      {(content.contentType === "changelog" ||
        content.contentType === "blog_post") &&
      content.githubPublish ? (
        <Button
          nativeButton={false}
          render={
            <a
              href={content.githubPublish.pullRequestUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Github className="size-4" />
              <span className="max-w-52 truncate">
                {content.githubPublish.owner}/{content.githubPublish.repo} #
                {content.githubPublish.pullRequestNumber}
              </span>
            </a>
          }
          size="sm"
          variant="outline"
        />
      ) : null}
      {(content.contentType === "changelog" ||
        content.contentType === "blog_post") &&
      !content.githubPublish &&
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

export function ContentDetailToolbar(props: ContentDetailToolbarProps) {
  const { content, document, organizationId } = props;
  const updatesLinkedPullRequest = Boolean(content.githubPublish);
  let saveLabel = "Save changes";
  if (updatesLinkedPullRequest) {
    saveLabel = document.isSaving ? "Updating PR…" : "Save and update PR";
  } else if (document.isSaving) {
    saveLabel = "Saving…";
  }
  return (
    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
      {document.hasChanges ? (
        <>
          <Button
            disabled={document.isSaving}
            onClick={document.handleDiscard}
            size="sm"
            variant="ghost"
          >
            Discard changes
          </Button>
          <Button
            aria-keyshortcuts="Meta+S Control+S"
            data-save-bar
            disabled={document.isSaving}
            onClick={document.handleSave}
            size="sm"
            variant="outline"
          >
            {saveLabel}
          </Button>
        </>
      ) : null}
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
    </div>
  );
}
