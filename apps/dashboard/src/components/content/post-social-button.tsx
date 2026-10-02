"use client";

import { Confetti } from "@neoconfetti/react";
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
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/button";
import { AddReferenceControl } from "@/components/content/add-reference-control";
import { PostSocialErrorNotice } from "@/components/content/post-social-error-notice";
import { PostSocialIntentButton } from "@/components/content/post-social-intent-button";
import { LinkedInPost } from "@/components/linkedin-post";
import { TwitterPost } from "@/components/twitter-post";
import { LINKEDIN_BRAND_PRIMARY } from "@/constants/linkedin";
import { CONFETTI_COLORS } from "@/constants/post-social";
import { SOCIAL_PLATFORM_LABELS } from "@/constants/social-connect";
import { useBrandSettings } from "@/lib/hooks/use-brand-analysis";
import { useCreateReferenceForVoice } from "@/lib/hooks/use-brand-references";
import { usePublishSocialPost } from "@/lib/hooks/use-connected-accounts";
import { useSelectedSocialAccount } from "@/lib/hooks/use-selected-social-account";
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
  const { data: brandSettings } = useBrandSettings(organizationId);
  const voices = brandSettings?.voices ?? [];
  const createReference = useCreateReferenceForVoice(organizationId);
  const [referencedVoiceIds, setReferencedVoiceIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [localDraft, setLocalDraft] = useState(content);
  const [publishedContent, setPublishedContent] = useState<string | null>(null);
  const draft = onContentChange ? content : localDraft;
  const handleDraftChange = onContentChange ?? setLocalDraft;

  const label = SOCIAL_PLATFORM_LABELS[platform];
  const isTwitter = platform === "twitter";
  const BrandIcon = isTwitter ? XTwitter : Linkedin;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setLocalDraft(content);
      return;
    }
    publishMutation.reset();
    setReferencedVoiceIds([]);
    setPublishedContent(null);
    setLocalDraft(content);
  };

  const handlePublish = () => {
    if (!(selectedAccount && draft.trim()) || isOverCharLimit) {
      return;
    }
    const contentToPublish = draft;
    setPublishedContent(contentToPublish);
    publishMutation.mutate(
      { accountId: selectedAccount.id, content: contentToPublish, from },
      {
        onError: () => {
          setPublishedContent(null);
        },
        onSuccess: (result) => {
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

  const published = publishMutation.isSuccess ? publishMutation.data : null;
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
    publishMutation.error,
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
        {publishMutation.isError && (
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
                disabled={!draft.trim() || isOverCharLimit}
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
