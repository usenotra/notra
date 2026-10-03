"use client";

import { Download01Icon, SentIcon, TextIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@notra/ui/components/ui/dropdown-menu";
import {
  SplitButton,
  SplitButtonTrigger,
} from "@notra/ui/components/ui/split-button";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("content.toolbar");
  const tCommon2 = useTranslations("common");
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
        {tCommon2("labels.downloadImage")}
      </Button>
      <SplitButton
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
          {t("copyFor", {
            target: getImageExportTargetLabel(document.imageExportTarget),
          })}
        </Button>
        <DropdownMenu>
          <SplitButtonTrigger
            label={t("selectExportTarget")}
            size="sm"
            variant="outline"
          />
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
                      <span>
                        {t("copyFor", {
                          target: getImageExportTargetLabel(target),
                        })}
                      </span>
                      {isWonder ? (
                        <span className="text-muted-foreground text-xs">
                          {t("comingSoon")}
                        </span>
                      ) : null}
                    </span>
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SplitButton>
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
  const tCommon2 = useTranslations("common");
  let publishLabel = tCommon2("labels.publish");
  if (document.isTogglingStatus) {
    publishLabel = tCommon2("labels.updating");
  } else if (content.status === "published") {
    publishLabel = tCommon2("labels.moveToDraft");
  }
  if (document.isGeoWriterPlanMode) {
    return document.isGeoWriterBriefMissing ? null : <WriterExecute.Button />;
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
        {publishLabel}
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
  const t = useTranslations("content.toolbar");
  const tCommon = useTranslations("common.actions");
  const updatesLinkedPullRequest = Boolean(content.githubPublish);
  let saveLabel = tCommon("saveChanges");
  if (updatesLinkedPullRequest) {
    saveLabel = document.isSaving ? t("updatingPr") : t("saveAndUpdatePr");
  } else if (document.isSaving) {
    saveLabel = tCommon("saving");
  }
  return (
    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
      {document.hasChanges &&
      (updatesLinkedPullRequest ||
        document.saveFailed ||
        document.reviewPreviousMarkdown) ? (
        <>
          <Button
            disabled={document.isSaving}
            onClick={document.handleDiscard}
            size="sm"
            variant="ghost"
          >
            {t("discardChanges")}
          </Button>
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
