"use client";

import { Confetti } from "@neoconfetti/react";
import type {
  SocialScheduleRef,
  SocialVideoAttachment as SocialVideoDraft,
} from "@notra/schemas/dashboard/content";
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@notra/ui/components/shared/responsive-dialog";
import { Linkedin } from "@notra/ui/components/ui/svgs/linkedin";
import { XTwitter } from "@notra/ui/components/ui/svgs/twitter";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/button";
import { AddReferenceControl } from "@/components/content/add-reference-control";
import { PostSocialErrorNotice } from "@/components/content/post-social-error-notice";
import { PostSocialIntentButton } from "@/components/content/post-social-intent-button";
import { SocialVideoAttachment } from "@/components/content/social-video-attachment";
import { LinkedInPost } from "@/components/linkedin-post";
import { TwitterPost } from "@/components/twitter-post";
import { LINKEDIN_BRAND_PRIMARY } from "@/constants/linkedin";
import { CONFETTI_COLORS } from "@/constants/post-social";
import {
  SOCIAL_PLATFORM_LABELS,
  SOCIAL_POST_EXTERNAL_ID_PREFIX,
} from "@/constants/social-connect";
import { useBrandSettings } from "@/lib/hooks/use-brand-analysis";
import { useCreateReferenceForVoice } from "@/lib/hooks/use-brand-references";
import {
  useCancelScheduledSocialPost,
  usePublishSocialPost,
  useScheduledSocialPosts,
  useUpdateScheduledSocialPost,
} from "@/lib/hooks/use-connected-accounts";
import { useSelectedSocialAccount } from "@/lib/hooks/use-selected-social-account";
import { dashboardOrpc } from "@/lib/orpc/query";
import { cn } from "@/lib/utils";
import type { PostSocialButtonProps } from "@/types/content/post-social";
import { linkedInAuthorFromAccount } from "@/utils/linkedin";
import {
  buildReferenceInput,
  getPublishErrorInfo,
  isReferenceLimitError,
} from "@/utils/social-publish";
import {
  getTwitterCharLimit,
  getWeightedTweetLength,
  twitterAuthorFromAccount,
} from "@/utils/twitter";

export function PostSocialButton({
  platform,
  organizationId,
  content,
  className,
  onContentChange,
  onPublished,
  from,
  contentId,
  initialVideo,
}: PostSocialButtonProps) {
  const t = useTranslations("content.postSocial");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  const params = useParams<{ slug?: string }>();
  const router = useRouter();
  const { accounts, selectedAccount, selectAccount } = useSelectedSocialAccount(
    organizationId,
    platform
  );
  const publishMutation = usePublishSocialPost(organizationId, platform);
  const scheduleMutation = usePublishSocialPost(organizationId, platform);
  const { data: brandSettings } = useBrandSettings(organizationId);
  const voices = brandSettings?.voices ?? [];
  const createReference = useCreateReferenceForVoice(organizationId);
  const [referencedVoiceIds, setReferencedVoiceIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [localDraft, setLocalDraft] = useState(content);
  const [publishedContent, setPublishedContent] = useState<string | null>(null);
  const [video, setVideo] = useState(initialVideo ?? null);
  const [scheduleInput, setScheduleInput] = useState("");
  const [scheduleMin, setScheduleMin] = useState("");
  // Replacement video for an already-scheduled post. Kept separate from the
  // composer `video` state so the provider-side media stays the source of
  // truth until Update is clicked; `mediaCleared` records an explicit removal.
  const [replacementVideo, setReplacementVideo] =
    useState<SocialVideoDraft | null>(null);
  const [mediaCleared, setMediaCleared] = useState(false);
  // A video upload finishing after Schedule/Update/Publish would silently
  // drop the video from the provider post — block mutations while in flight.
  const [videoUploading, setVideoUploading] = useState(false);
  const reactAdhocId = useId();
  const queryClient = useQueryClient();
  const draft = onContentChange ? content : localDraft;
  const handleDraftChange = onContentChange ?? setLocalDraft;

  // Adhoc (contentId-less) schedules need a stable external id across
  // remounts, or the provider-side post becomes unmanageable. Persist per
  // account + surface in session storage; same-surface simultaneous drafts
  // share an id and the UI lists every active post.
  const adhocStorageKey = selectedAccount
    ? `notra:adhoc-id:${organizationId}:${platform}:${selectedAccount.id}:${from ?? "default"}`
    : null;
  const [storedAdhocId, setStoredAdhocId] = useState<string | null>(null);
  useEffect(() => {
    if (!adhocStorageKey) {
      return;
    }
    try {
      const existing = sessionStorage.getItem(adhocStorageKey);
      if (existing) {
        setStoredAdhocId(existing);
        return;
      }
      const fresh = reactAdhocId.replace(/[^a-zA-Z0-9_-]/g, "") || "adhoc";
      sessionStorage.setItem(adhocStorageKey, fresh);
      setStoredAdhocId(fresh);
    } catch {
      setStoredAdhocId(null);
    }
  }, [adhocStorageKey, reactAdhocId]);
  const sanitizedAdhocId = useMemo(
    () =>
      (storedAdhocId ?? reactAdhocId.replace(/[^a-zA-Z0-9_-]/g, "")) || "adhoc",
    [storedAdhocId, reactAdhocId]
  );

  // Keep the closed-dialog draft in sync when the parent cache refreshes
  // (e.g. after persistDraftPatch), without clobbering an in-progress pick.
  const initialVideoKey = initialVideo?.key ?? null;
  const syncedVideoKeyRef = useRef(initialVideoKey);
  useEffect(() => {
    if (!open && syncedVideoKeyRef.current !== initialVideoKey) {
      syncedVideoKeyRef.current = initialVideoKey;
      setVideo(initialVideo ?? null);
    }
  }, [initialVideo, initialVideoKey, open]);
  const refreshScheduleMin = () => {
    // UX guard only — runs in an event handler; the server revalidates.
    const d = new Date(Date.now() + 60_000);
    const pad = (n: number) => String(n).padStart(2, "0");
    setScheduleMin(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
  };

  const getExternalId = () => {
    if (!selectedAccount) {
      return null;
    }
    if (contentId) {
      return `${SOCIAL_POST_EXTERNAL_ID_PREFIX}${contentId}:${selectedAccount.id}`;
    }
    return `${SOCIAL_POST_EXTERNAL_ID_PREFIX}adhoc:${sanitizedAdhocId}`;
  };
  const externalId = getExternalId();

  const scheduledQuery = useScheduledSocialPosts(
    organizationId,
    selectedAccount?.id ?? null,
    externalId,
    open
  );
  const updateScheduled = useUpdateScheduledSocialPost(organizationId);
  const cancelScheduled = useCancelScheduledSocialPost(organizationId);
  const scheduledPosts = scheduledQuery.data?.posts ?? [];
  const scheduled = scheduledPosts.at(0) ?? null;
  const extraScheduled = scheduledPosts.slice(1);
  const scheduledLoading =
    scheduledQuery.isLoading || scheduledQuery.isFetching;
  // A failed list looks identical to "no schedules" — publishing or
  // scheduling then would double-deliver next to the unseen post.
  const scheduleListFailed = scheduledQuery.isError;

  // A replacement picked for one scheduled post must not leak into another
  // account's post when the query key changes.
  const activeScheduledId = scheduled?.postId ?? null;
  useEffect(() => {
    setReplacementVideo(null);
    setMediaCleared(false);
  }, [activeScheduledId]);

  const persistDraftPatch = (
    patch:
      | { socialVideo: SocialVideoDraft | null }
      | { socialSchedule: SocialScheduleRef | null },
    errorMessage?: string
  ) => {
    if (!contentId) {
      return;
    }
    dashboardOrpc.content.update
      .call({ organizationId, contentId, sourceMetadata: patch })
      .then(() => {
        void queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.get.queryKey({
            input: { organizationId, contentId },
          }),
        });
      })
      .catch(() => {
        toast.error(errorMessage ?? t("attachmentSaveFailed"));
      });
  };

  const handleVideoChange = (next: SocialVideoDraft | null) => {
    setVideo(next);
    persistDraftPatch({ socialVideo: next });
  };

  // Replacement video for an already-scheduled post. Applied on Update;
  // the provider-side media stays the source of truth until then. Picking
  // then removing a file returns to untouched (provider media kept); the
  // dedicated Remove button below performs an explicit clear.
  const handleScheduledVideoChange = (next: SocialVideoDraft | null) => {
    setReplacementVideo(next);
    if (next) {
      setMediaCleared(false);
    }
  };

  const label = SOCIAL_PLATFORM_LABELS[platform];
  const isTwitter = platform === "twitter";
  const BrandIcon = isTwitter ? XTwitter : Linkedin;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setLocalDraft(content);
      setVideo(initialVideo ?? null);
      setReplacementVideo(null);
      setMediaCleared(false);
      setScheduleInput("");
      refreshScheduleMin();
      publishMutation.reset();
      scheduleMutation.reset();
      return;
    }
    publishMutation.reset();
    scheduleMutation.reset();
    setReferencedVoiceIds([]);
    setPublishedContent(null);
    setLocalDraft(content);
    setScheduleInput("");
  };

  const handlePublish = () => {
    if (!(selectedAccount && draft.trim()) || isOverCharLimit) {
      return;
    }
    const contentToPublish = draft;
    setPublishedContent(contentToPublish);
    publishMutation.mutate(
      {
        accountId: selectedAccount.id,
        content: contentToPublish,
        from,
        mediaUrls: video ? [video.url] : undefined,
      },
      {
        onError: () => {
          setPublishedContent(null);
        },
        onSuccess: (result) => {
          persistDraftPatch({ socialSchedule: null });
          onPublished?.({
            platform,
            postUrl: result.postUrl,
            username: result.username,
            content: contentToPublish,
          });
        },
      }
    );
  };

  const toScheduledAt = (value: string): string | null => {
    if (!value) {
      return null;
    }
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? null : new Date(time).toISOString();
  };

  const handleSchedule = () => {
    if (
      !(selectedAccount && externalId && draft.trim()) ||
      isOverCharLimit ||
      scheduleMutation.isPending ||
      publishMutation.isPending
    ) {
      return;
    }
    const scheduledAt = toScheduledAt(scheduleInput);
    if (!scheduledAt) {
      return;
    }
    scheduleMutation.mutate(
      {
        accountId: selectedAccount.id,
        content: draft,
        from,
        mediaUrls: video ? [video.url] : undefined,
        scheduledAt,
        externalId,
      },
      {
        onSuccess: (result) => {
          persistDraftPatch(
            {
              socialSchedule: {
                postId: result.postId,
                accountId: selectedAccount.id,
                platform,
                scheduledAt: result.scheduledAt ?? scheduledAt,
                status: result.status,
              },
            },
            t("scheduleSaveFailed")
          );
          scheduleMutation.reset();
          void scheduledQuery.refetch();
        },
      }
    );
  };

  const handleUpdateScheduled = () => {
    if (
      !(selectedAccount && scheduled && externalId) ||
      updateScheduled.isPending
    ) {
      return;
    }
    const scheduledAt = scheduleInput
      ? (toScheduledAt(scheduleInput) ?? undefined)
      : undefined;
    let mediaUrls: string[] | undefined;
    if (mediaCleared) {
      mediaUrls = [];
    } else if (replacementVideo) {
      mediaUrls = [replacementVideo.url];
    }
    updateScheduled.mutate(
      {
        accountId: selectedAccount.id,
        postId: scheduled.postId,
        externalId,
        content: draft,
        mediaUrls,
        scheduledAt,
      },
      {
        onSuccess: (result) => {
          if (result.scheduledAt) {
            persistDraftPatch(
              {
                socialSchedule: {
                  postId: result.postId,
                  accountId: selectedAccount.id,
                  platform,
                  scheduledAt: result.scheduledAt,
                  status: result.status,
                },
              },
              t("scheduleSaveFailed")
            );
          }
          if (mediaCleared) {
            setVideo(null);
            persistDraftPatch({ socialVideo: null });
          } else if (replacementVideo) {
            setVideo(replacementVideo);
            persistDraftPatch({ socialVideo: replacementVideo });
          }
          setReplacementVideo(null);
          setMediaCleared(false);
          void scheduledQuery.refetch();
        },
      }
    );
  };

  const clearAdhocId = () => {
    if (contentId || !adhocStorageKey) {
      return;
    }
    // Rotate to the in-memory fallback id and persist it: dropping the stored
    // id would orphan the next schedule after remount (useId differs per
    // mount), while the cancelled post no longer needs the old one.
    const rotated = reactAdhocId.replace(/[^a-zA-Z0-9_-]/g, "") || "adhoc";
    try {
      sessionStorage.setItem(adhocStorageKey, rotated);
    } catch {
      // storage unavailable — per-mount id still isolates drafts
    }
    setStoredAdhocId(rotated);
  };

  const handleCancelScheduled = (postId?: string) => {
    if (
      !(selectedAccount && scheduled && externalId) ||
      cancelScheduled.isPending
    ) {
      return;
    }
    // Only clear the draft ref + adhoc id when the last remaining post is
    // cancelled; otherwise the surviving post would become unmanageable.
    const isLastRemaining = scheduledPosts.length <= 1;
    cancelScheduled.mutate(
      {
        accountId: selectedAccount.id,
        postId: postId ?? scheduled.postId,
        externalId,
      },
      {
        onSuccess: () => {
          if (isLastRemaining) {
            persistDraftPatch(
              { socialSchedule: null },
              t("scheduleSaveFailed")
            );
            clearAdhocId();
          }
          setReplacementVideo(null);
          setMediaCleared(false);
          void scheduledQuery.refetch();
        },
      }
    );
  };

  const published = publishMutation.isSuccess ? publishMutation.data : null;
  const scheduleError = scheduleMutation.error ?? publishMutation.error;
  const showPublishError = publishMutation.isError || scheduleMutation.isError;
  const isLocked = publishMutation.isPending || published !== null;
  const displayContent = isLocked ? (publishedContent ?? draft) : draft;

  const handleAddReference = (voiceId: string, voiceName: string) => {
    if (!(published && selectedAccount)) {
      return;
    }
    createReference.mutate(
      {
        voiceId,
        data: buildReferenceInput(
          platform,
          displayContent,
          published.postUrl,
          published.platformPostId,
          published.username,
          selectedAccount
        ),
      },
      {
        onSuccess: () => {
          setReferencedVoiceIds((ids) => [...ids, voiceId]);
          toast.success(t("addedReference", { name: voiceName }));
        },
        onError: (error) => {
          const message =
            error instanceof Error && error.message
              ? error.message
              : t("addReferenceFailed");
          if (isReferenceLimitError(error) && params.slug) {
            const billingPath = `/${params.slug}/settings/billing`;
            toast.error(message, {
              action: {
                label: tCommon("upgrade"),
                onClick: () => router.push(billingPath),
              },
            });
            return;
          }
          toast.error(message);
        },
      }
    );
  };

  const handleMissingVoice = () => {
    toast.error(t("noBrandIdentity"));
  };

  const publishError = getPublishErrorInfo(
    scheduleError,
    tCommon2("labels.failedToPublishPost"),
    platform
  );

  const charLimit =
    platform === "twitter" && selectedAccount
      ? getTwitterCharLimit(selectedAccount.verifiedType)
      : null;
  const overCharCount = charLimit
    ? Math.max(0, getWeightedTweetLength(draft) - charLimit)
    : 0;
  const isOverCharLimit = overCharCount > 0;

  if (!selectedAccount) {
    return (
      <PostSocialIntentButton
        className={className}
        content={content}
        platform={platform}
      />
    );
  }

  const accountSelector = isLocked
    ? undefined
    : { accounts, onSelect: selectAccount };

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveDialogTrigger
        className={cn(
          buttonVariants({ size: "sm" }),
          isTwitter
            ? "bg-foreground text-background hover:bg-foreground/90"
            : "text-white hover:opacity-90",
          className
        )}
        style={
          isTwitter ? undefined : { backgroundColor: LINKEDIN_BRAND_PRIMARY }
        }
      >
        <BrandIcon className="size-4" />
        {t("postTo", { platform: label })}
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-lg">
        {published && (
          <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2">
            <Confetti
              colors={CONFETTI_COLORS}
              duration={3000}
              force={0.5}
              particleCount={120}
              particleShape="mix"
              particleSize={8}
              stageHeight={600}
              stageWidth={800}
            />
          </div>
        )}
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {t("postTo", { platform: label })}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        {showPublishError && (
          <PostSocialErrorNotice
            error={publishError}
            label={label}
            slug={params.slug}
          />
        )}
        <div className="max-h-[55svh] overflow-y-auto p-0.5">
          {platform === "twitter" ? (
            <TwitterPost
              accountSelector={accountSelector}
              author={twitterAuthorFromAccount(selectedAccount)}
              className="h-auto"
              content={displayContent}
              onContentChange={isLocked ? undefined : handleDraftChange}
              timestamp={tCommon2("labels.justNow")}
            />
          ) : (
            <LinkedInPost
              accountSelector={accountSelector}
              author={linkedInAuthorFromAccount(selectedAccount)}
              content={displayContent}
              defaultExpanded
              onContentChange={isLocked ? undefined : handleDraftChange}
              timestamp={tCommon2("labels.justNow")}
              truncate={false}
            />
          )}
        </div>
        {!published &&
          (scheduled ? (
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">{t("scheduledTitle")}</p>
              <p className="text-muted-foreground text-sm">
                {t("scheduledTo", {
                  username: selectedAccount.username,
                  platform: label,
                })}
              </p>
              {scheduled.scheduledAt ? (
                <p className="text-muted-foreground text-sm">
                  {t("scheduledFor", {
                    date: new Date(scheduled.scheduledAt).toLocaleString(),
                  })}
                </p>
              ) : null}
              <p className="text-muted-foreground text-sm">
                {t("scheduledStatus", { status: scheduled.status })}
              </p>
              {scheduled.mediaUrls[0] && !replacementVideo && !mediaCleared ? (
                // oxlint-disable-next-line jsx-a11y/media-has-caption -- uploads do not include a caption file
                <video
                  className="max-h-40 w-full rounded-md bg-black"
                  controls
                  preload="metadata"
                  src={scheduled.mediaUrls[0]}
                />
              ) : null}
              <SocialVideoAttachment
                disabled={
                  updateScheduled.isPending || cancelScheduled.isPending
                }
                onChange={handleScheduledVideoChange}
                onUploadingChange={setVideoUploading}
                value={replacementVideo}
              />
              {scheduled.mediaUrls[0] && !replacementVideo && !mediaCleared ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    disabled={
                      updateScheduled.isPending || cancelScheduled.isPending
                    }
                    onClick={() => setMediaCleared(true)}
                    size="sm"
                    variant="ghost"
                  >
                    {t("removeVideo")}
                  </Button>
                </div>
              ) : null}
              {mediaCleared ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-muted-foreground text-xs">
                    {t("scheduledVideoRemoved")}
                  </p>
                  <Button
                    disabled={updateScheduled.isPending}
                    onClick={() => setMediaCleared(false)}
                    size="sm"
                    variant="ghost"
                  >
                    {t("keepVideo")}
                  </Button>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  aria-label={t("scheduleAt")}
                  className="border-input rounded-md border bg-transparent px-2 py-1 text-sm"
                  disabled={
                    updateScheduled.isPending || cancelScheduled.isPending
                  }
                  min={scheduleMin}
                  onChange={(event) => setScheduleInput(event.target.value)}
                  onFocus={refreshScheduleMin}
                  type="datetime-local"
                  value={scheduleInput}
                />
                <Button
                  disabled={
                    updateScheduled.isPending ||
                    cancelScheduled.isPending ||
                    videoUploading ||
                    !draft.trim() ||
                    isOverCharLimit
                  }
                  onClick={handleUpdateScheduled}
                  size="sm"
                  variant="outline"
                >
                  {updateScheduled.isPending
                    ? t("savingSchedule")
                    : t("updateSchedule")}
                </Button>
                <Button
                  disabled={
                    cancelScheduled.isPending || updateScheduled.isPending
                  }
                  onClick={() => handleCancelScheduled()}
                  size="sm"
                  variant="ghost"
                >
                  {cancelScheduled.isPending
                    ? t("cancellingSchedule")
                    : t("cancelSchedule")}
                </Button>
              </div>
              {extraScheduled.length > 0 ? (
                <div className="space-y-1 pt-1">
                  <p className="text-muted-foreground text-xs">
                    {t("extraSchedules", { count: extraScheduled.length })}
                  </p>
                  {extraScheduled.map((extra) => (
                    <div
                      className="flex items-center justify-between gap-2"
                      key={extra.postId}
                    >
                      <span className="text-muted-foreground truncate text-xs">
                        {extra.scheduledAt
                          ? new Date(extra.scheduledAt).toLocaleString()
                          : extra.status}
                      </span>
                      <Button
                        disabled={
                          cancelScheduled.isPending || updateScheduled.isPending
                        }
                        onClick={() => handleCancelScheduled(extra.postId)}
                        size="sm"
                        variant="ghost"
                      >
                        {t("cancelSchedule")}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {scheduleListFailed ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-destructive text-sm">
                    {t("scheduleListFailed")}
                  </p>
                  <Button
                    disabled={scheduledLoading}
                    onClick={() => scheduledQuery.refetch()}
                    size="sm"
                    variant="ghost"
                  >
                    {tCommon("retry")}
                  </Button>
                </div>
              ) : null}
              <SocialVideoAttachment
                disabled={isLocked}
                onChange={handleVideoChange}
                onUploadingChange={setVideoUploading}
                value={video}
              />
              <div className="flex flex-wrap items-center gap-2">
                <input
                  aria-label={t("scheduleAt")}
                  className="border-input rounded-md border bg-transparent px-2 py-1 text-sm"
                  disabled={isLocked || scheduleMutation.isPending}
                  min={scheduleMin}
                  onChange={(event) => setScheduleInput(event.target.value)}
                  onFocus={refreshScheduleMin}
                  type="datetime-local"
                  value={scheduleInput}
                />
                <Button
                  disabled={
                    isLocked ||
                    scheduleMutation.isPending ||
                    publishMutation.isPending ||
                    scheduledLoading ||
                    scheduleListFailed ||
                    videoUploading ||
                    !draft.trim() ||
                    isOverCharLimit ||
                    !toScheduledAt(scheduleInput)
                  }
                  onClick={handleSchedule}
                  size="sm"
                  variant="outline"
                >
                  {scheduleMutation.isPending
                    ? t("scheduling")
                    : t("scheduleAction")}
                </Button>
              </div>
            </div>
          ))}
        {!published && charLimit !== null && isOverCharLimit && (
          <p className="text-warning text-sm">
            {t("overLimit", {
              count: overCharCount,
              limit: charLimit,
              username: selectedAccount.username,
            })}
          </p>
        )}
        <ResponsiveDialogFooter>
          {published ? (
            <>
              <AddReferenceControl
                isPending={createReference.isPending}
                onAdd={handleAddReference}
                onMissingVoice={handleMissingVoice}
                referencedVoiceIds={referencedVoiceIds}
                voices={voices}
              />
              {published.postUrl && (
                <Button
                  nativeButton={false}
                  render={
                    <a
                      href={published.postUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <BrandIcon className="size-4" />
                      {t("openOn", { platform: label })}
                    </a>
                  }
                  variant="outline"
                />
              )}
              <ResponsiveDialogClose
                render={<Button>{tCommon("done")}</Button>}
              />
            </>
          ) : (
            <>
              <ResponsiveDialogClose
                render={<Button variant="outline">{tCommon("cancel")}</Button>}
              />
              <Button
                disabled={
                  scheduleMutation.isPending ||
                  scheduledLoading ||
                  scheduleListFailed ||
                  videoUploading ||
                  !draft.trim() ||
                  isOverCharLimit ||
                  scheduled !== null
                }
                loading={publishMutation.isPending}
                onClick={handlePublish}
              >
                {t("postAs", { username: selectedAccount.username })}
              </Button>
            </>
          )}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
