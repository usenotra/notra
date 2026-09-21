"use client";

import {
  ArrowDown01Icon,
  Download01Icon,
  SentIcon,
  TextIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import type { ContentResponse } from "@notra/schemas/dashboard/content";
import { Button } from "@notra/ui/components/ui/button";
import { ButtonGroup } from "@notra/ui/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";

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
import type { ContentDetailDocument } from "@/lib/hooks/use-content-detail-document";
import { cn } from "@/lib/utils";
import type { ImageExportTarget } from "@/types/content/image-export";
import { getPublishButtonLabel } from "@/utils/content-detail";
import {
  getImageExportTargetLabel,
  isImageExportTarget,
} from "@/utils/image-export";

interface ContentDetailToolbarProps {
  content: ContentResponse;
  contentId: string;
  document: ContentDetailDocument;
  imageDownloadUrl: string | null;
  imageExportHtml: string | null;
  imageExportHtmlUrl: string | null;
  organizationId: string;
  organizationSlug: string;
}

export function ContentDetailToolbar({
  content,
  contentId,
  document,
  imageDownloadUrl,
  imageExportHtml,
  imageExportHtmlUrl,
  organizationId,
  organizationSlug,
}: ContentDetailToolbarProps) {
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
    <div className="ml-auto flex shrink-0 items-center gap-2">
      {(content.contentType === "changelog" ||
        content.contentType === "blog_post") &&
        document.currentMarkdown.trim() !== "" && (
          <PublishContentToGitHubDialog
            contentId={contentId}
            contentType={content.contentType}
            githubPublish={content.githubPublish}
            onSave={document.handleSave}
            organizationId={organizationId}
            organizationSlug={organizationSlug}
            title={document.title}
          />
        )}
      {document.isGeoWriterPlanMode ? <WriterExecute.Button /> : null}
      {content.contentType !== "image" && !document.isGeoWriterPlanMode ? (
        <Button
          disabled={document.isTogglingStatus}
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
      ) : null}
      {content.contentType === "linkedin_post" && (
        <PostSocialButton
          content={document.currentMarkdown}
          from="editor"
          onContentChange={document.setEditedMarkdown}
          organizationId={organizationId}
          platform="linkedin"
        />
      )}
      {content.contentType === "twitter_post" && (
        <PostSocialButton
          content={document.currentMarkdown}
          from="editor"
          onContentChange={document.setEditedMarkdown}
          organizationId={organizationId}
          platform="twitter"
        />
      )}
      {content.contentType === "image" && (
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
            onMouseEnter={() =>
              preloadImageExportCopy(document.imageExportTarget)
            }
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
                          <span>
                            Copy for {getImageExportTargetLabel(target)}
                          </span>
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
      )}
    </div>
  );
}
