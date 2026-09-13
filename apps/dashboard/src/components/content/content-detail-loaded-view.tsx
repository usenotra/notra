"use client";

import {
  ArrowDown01Icon,
  ArrowLeft02Icon,
  Download01Icon,
  SentIcon,
  SidebarRight01Icon,
  TextIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TextSelection } from "@notra/ai/types/chat";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { sourceMetadataSchema } from "@notra/schemas/dashboard/content";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Badge } from "@notra/ui/components/ui/badge";
import { Button } from "@notra/ui/components/ui/button";
import { ButtonGroup } from "@notra/ui/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";

import { getContentTypeLabel } from "@/components/content/content-card";
import { ContentPlanView } from "@/components/content/content-plan-view";
import { ContentEditorSwitch } from "@/components/content/editors";
import { ImageExportTargetIcon } from "@/components/content/image-export-target-icon";
import { PostSocialButton } from "@/components/content/post-social-button";
import { PublishContentToGitHubDialog } from "@/components/content/publish-content-to-github-dialog";
import { RecommendationsSection } from "@/components/content/recommendations-section";
import { WriterExecute } from "@/components/geo/writer/writer-execute";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { CONTENT_PLAN_STAGE_LABEL } from "@/constants/content-plan";
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
import { dashboardOrpc } from "@/lib/orpc/query";
import { cn } from "@/lib/utils";
import type { ImageExportTarget } from "@/types/content/image-export";
import type { ContentApiResponse } from "@/types/hooks/content";
import { getBrandFaviconUrl } from "@/utils/brand";
import {
  formatDate,
  formatDateRange,
  formatLookbackWindow,
  formatRepos,
  formatTriggerType,
  getPublishButtonLabel,
} from "@/utils/content-detail";
import { getImageExportHtml, isHttpImageContent } from "@/utils/image-content";
import {
  getImageExportTargetLabel,
  isImageExportTarget,
} from "@/utils/image-export";

interface ContentDetailLoadedViewProps {
  contentId: string;
  organizationId: string;
  organizationSlug: string;
  data: ContentApiResponse;
  document: ContentDetailDocument;
  onSelectionChange: (sel: TextSelection | null) => void;
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
  rightPanelSection,
  saveBarSection,
  chatInputSection,
  isActivityPanelOpen,
  onToggleActivityPanel,
}: ContentDetailLoadedViewProps) {
  const { data: brandResponse } = useQuery(
    dashboardOrpc.brand.voices.list.queryOptions({
      input: { organizationId },
      enabled: !!organizationId,
    })
  );
  const { activeOrganization } = useOrganizationsContext();

  const content = data.content;
  const imageExportHtml =
    content.contentType === "image" ? getImageExportHtml(content) : null;
  const imageExportHtmlUrl =
    content.contentType === "image" ? content.htmlUrl : null;
  const imageDownloadUrl =
    content.contentType === "image" && isHttpImageContent(content.content)
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

  const handleCopyImageExport = () =>
    copyImageExportFor(document.imageExportTarget);

  const handleImageExportTargetSelect = (value: string) => {
    if (!isImageExportTarget(value) || value === "wonder") {
      return;
    }
    document.handleImageExportTargetSelect(value);
    preloadImageExportCopy(value);
  };

  const collection = data.collection;
  const backHref = collection
    ? `/${organizationSlug}/collection/${collection.id}`
    : `/${organizationSlug}/content`;
  const backLabel = collection ? "Back to collection" : "Back to Content";
  const planBrief = document.geoWriterBriefQuery.data?.brief;

  let mainDocument = (
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

  if (document.isGeoWriterPlanMode && planBrief) {
    mainDocument = (
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
  } else if (document.isGeoWriterPlanMode) {
    mainDocument = (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="bg-muted/60 h-4 w-24 animate-pulse rounded-sm" />
        <div className="bg-muted/60 h-10 w-3/4 animate-pulse rounded-sm" />
        <div className="bg-muted/60 h-16 w-full animate-pulse rounded-sm" />
        <div className="bg-muted/60 h-40 w-full animate-pulse rounded-sm" />
      </div>
    );
  }

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
                {content.contentType === "blog_post" ? (
                  <p className="text-muted-foreground text-sm">
                    {document.isGeoWriterPlanMode
                      ? CONTENT_PLAN_STAGE_LABEL
                      : "Blog post"}
                    {content.status === "draft" &&
                    !document.isGeoWriterPlanMode ? (
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
                    {content.contentType !== "image" && (
                      <Badge
                        className="capitalize"
                        variant={
                          content.status === "published" ? "default" : "outline"
                        }
                      >
                        {content.status}
                      </Badge>
                    )}
                  </div>
                )}
                {content.sourceMetadata &&
                  (() => {
                    const parsed = sourceMetadataSchema.safeParse(
                      content.sourceMetadata
                    );
                    if (!parsed.success || !parsed.data) {
                      return null;
                    }
                    const meta = parsed.data;
                    const repositories = meta.repositories ?? [];
                    if (
                      repositories.length === 0 ||
                      !meta.triggerSourceType ||
                      !meta.lookbackWindow ||
                      !meta.lookbackRange
                    ) {
                      return null;
                    }

                    const triggerSourceType = meta.triggerSourceType;
                    const lookbackWindow = meta.lookbackWindow;
                    const lookbackRange = meta.lookbackRange;
                    const repoLabel = formatRepos(repositories);
                    const needsTooltip = repositories.length > 1;
                    return (
                      <p className="text-muted-foreground text-xs">
                        <span className="capitalize">
                          {formatTriggerType(triggerSourceType)}
                        </span>
                        {" \u00B7 "}
                        {needsTooltip ? (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <span className="cursor-help underline decoration-dotted underline-offset-2">
                                  {repoLabel}
                                </span>
                              }
                            />
                            <TooltipContent>
                              <ul>
                                {repositories.map((r) => (
                                  <li key={`${r.owner}/${r.repo}`}>
                                    {r.owner}/{r.repo}
                                  </li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          repoLabel
                        )}
                        {" \u00B7 "}
                        <span className="capitalize">
                          {formatLookbackWindow(lookbackWindow)}
                        </span>{" "}
                        (
                        {formatDateRange(
                          lookbackRange.start,
                          lookbackRange.end
                        )}
                        )
                        {meta.brandVoiceName &&
                          (() => {
                            const voice = meta.brandVoiceId
                              ? brandResponse?.voices.find(
                                  (v) => v.id === meta.brandVoiceId
                                )
                              : brandResponse?.voices.find(
                                  (v) => v.name === meta.brandVoiceName
                                );
                            return (
                              <>
                                {" \u00B7 "}
                                {voice ? (
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={
                                        <span className="cursor-help underline decoration-dotted underline-offset-2">
                                          {meta.brandVoiceName}
                                        </span>
                                      }
                                    />
                                    <TooltipContent
                                      className="flex items-start gap-3"
                                      side="top"
                                    >
                                      <Avatar
                                        className="mt-0.5 size-8 shrink-0 rounded-full after:rounded-full"
                                        size="sm"
                                      >
                                        <AvatarImage
                                          src={getBrandFaviconUrl(
                                            voice.websiteUrl
                                          )}
                                        />
                                        <AvatarFallback className="text-xs">
                                          {voice.name.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="space-y-0.5">
                                        <p className="font-medium">
                                          {voice.name}
                                        </p>
                                        {voice.toneProfile && (
                                          <p>Tone: {voice.toneProfile}</p>
                                        )}
                                        {voice.language && (
                                          <p>Language: {voice.language}</p>
                                        )}
                                        {voice.companyName && (
                                          <p>Company: {voice.companyName}</p>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  meta.brandVoiceName
                                )}
                              </>
                            );
                          })()}
                      </p>
                    );
                  })()}
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                {(content.contentType === "changelog" ||
                  content.contentType === "blog_post") &&
                  document.currentMarkdown.trim() !== "" && (
                    <PublishContentToGitHubDialog
                      contentId={contentId}
                      contentType={content.contentType}
                      onSave={document.handleSave}
                      organizationId={organizationId}
                      organizationSlug={organizationSlug}
                      title={document.title}
                    />
                  )}
                {document.isGeoWriterPlanMode ? <WriterExecute.Button /> : null}
                {content.contentType !== "image" &&
                !document.isGeoWriterPlanMode ? (
                  <Button
                    disabled={document.isTogglingStatus}
                    onClick={document.handleToggleStatus}
                    size="sm"
                    variant={content.status === "draft" ? "default" : "outline"}
                  >
                    {getPublishButtonLabel(
                      document.isTogglingStatus,
                      content.status
                    )}
                    <HugeiconsIcon
                      className="size-4"
                      icon={
                        content.status === "published" ? TextIcon : SentIcon
                      }
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
                        onClick={handleCopyImageExport}
                        size="sm"
                        variant="outline"
                      >
                        <ImageExportTargetIcon
                          className="size-4"
                          target={document.imageExportTarget}
                        />
                        Copy for{" "}
                        {getImageExportTargetLabel(document.imageExportTarget)}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button size="icon-sm" variant="outline" />}
                        >
                          <span className="sr-only">Select export target</span>
                          <HugeiconsIcon
                            className="size-4"
                            icon={ArrowDown01Icon}
                          />
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
                                  className={cn(
                                    "gap-2",
                                    isWonder && "items-start"
                                  )}
                                  closeOnClick
                                  disabled={isWonder}
                                  key={target}
                                  onFocus={() => preloadImageExportCopy(target)}
                                  onMouseEnter={() =>
                                    preloadImageExportCopy(target)
                                  }
                                  value={target}
                                >
                                  <ImageExportTargetIcon
                                    className="mt-0.5 size-4"
                                    target={target}
                                  />
                                  <span className="flex flex-col">
                                    <span>
                                      Copy for{" "}
                                      {getImageExportTargetLabel(target)}
                                    </span>
                                    {isWonder && (
                                      <span className="text-muted-foreground text-xs">
                                        Coming soon
                                      </span>
                                    )}
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
            </div>
          </WriterExecute.Root>

          {mainDocument}

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
