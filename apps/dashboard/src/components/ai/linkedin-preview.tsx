"use client";

import {
  ArrowReloadHorizontalIcon,
  ArrowRight01Icon,
  Cancel01Icon,
  CheckmarkSquare01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CHAT_PREVIEW_SAVE_TIMEOUT_MS } from "@notra/ai/constants/chat";
import { BrailleLoader } from "@notra/ui/components/shared/braille-loader";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { Effect } from "effect";
import { useEffect, useReducer } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { PostSocialButton } from "@/components/content/post-social-button";
import { LinkedInPost } from "@/components/linkedin-post";
import { useOutputTypeLabel } from "@/lib/hooks/use-output-type-label";
import { useSelectedSocialAccount } from "@/lib/hooks/use-selected-social-account";
import type {
  PreviewEffectiveState,
  SocialPreviewProps,
} from "@/types/content/ai-preview";
import { linkedInAuthorFromAccount } from "@/utils/linkedin";
import { OutputTypeIcon } from "@/utils/output-types";
import { socialPreviewReducer } from "@/utils/social-preview-reducer";

export function LinkedInPreview({
  state: incomingState,
  title,
  markdown,
  organizationId,
  organization,
  persistedStatus = "draft",
  onApprove,
  onDeny,
  onPersist,
  onPublished,
  onRegenerate,
}: SocialPreviewProps) {
  const t = useTranslations("ai.preview");
  const tCommon = useTranslations("common");
  const outputTypeLabel = useOutputTypeLabel();
  const [
    {
      userAction,
      draftMarkdown,
      regenerateOpen,
      regenerateInstructions,
      isOpen,
    },
    dispatch,
  ] = useReducer(socialPreviewReducer, {
    userAction: "none",
    draftMarkdown: markdown,
    regenerateOpen: false,
    regenerateInstructions: "",
    isOpen: incomingState !== "finished",
  });

  useEffect(() => {
    dispatch({ type: "draftMarkdownChanged", draftMarkdown: markdown });
  }, [markdown]);

  const { accounts, selectedAccount, selectAccount } = useSelectedSocialAccount(
    organizationId ?? "",
    "linkedin"
  );
  const author = selectedAccount
    ? linkedInAuthorFromAccount(selectedAccount)
    : {
        name: organization?.name ?? tCommon("labels.yourName"),
        avatar: organization?.logo ?? undefined,
      };

  const effectiveState: PreviewEffectiveState = (() => {
    if (incomingState === "finished") {
      return "finished";
    }
    if (userAction === "saving" || userAction === "generating") {
      return "loading";
    }
    return "draft";
  })();

  useEffect(() => {
    if (userAction !== "saving" && userAction !== "generating") {
      return;
    }
    const timer = window.setTimeout(() => {
      dispatch({ type: "userActionChanged", userAction: "save-failed" });
    }, CHAT_PREVIEW_SAVE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [userAction]);

  const handleApprove = () => {
    dispatch({ type: "userActionChanged", userAction: "saving" });
    dispatch({ type: "openChanged", open: false });
    const toastId = toast.loading(t("savingDraft"));
    const save = Effect.tryPromise({
      try: async () => {
        if (onPersist) {
          await onPersist("draft", {
            title,
            markdown: draftMarkdown,
          });
          return;
        }
        onApprove?.();
      },
      catch: (cause) =>
        cause instanceof Error ? cause : new Error(t("saveDraftFailed")),
    });
    Effect.runFork(
      save.pipe(
        Effect.match({
          onSuccess: () => {
            dispatch({ type: "userActionChanged", userAction: "none" });
            toast.success(t("savedAsDraft"), { id: toastId });
          },
          onFailure: (error) => {
            dispatch({ type: "userActionChanged", userAction: "save-failed" });
            dispatch({ type: "openChanged", open: true });
            toast.error(error.message || t("saveDraftFailed"), {
              id: toastId,
            });
          },
        })
      )
    );
  };

  const handleDeny = () => {
    onDeny?.();
    toast(tCommon("labels.canceled"));
  };

  const handleRegenerate = () => {
    const instructions = regenerateInstructions.trim();
    if (!instructions) {
      dispatch({ type: "regenerateOpenChanged", open: true });
      return;
    }
    dispatch({ type: "userActionChanged", userAction: "generating" });
    toast(t("generatingPostToast"));
    onRegenerate?.(instructions, {
      title,
      markdown: draftMarkdown,
    });
  };

  const isFinished = effectiveState === "finished";
  const showStatusBadge = isFinished && userAction !== "save-failed";

  return (
    <Collapsible
      onOpenChange={(open) => dispatch({ type: "openChanged", open })}
      open={isOpen}
    >
      <div className="ml-px max-w-md">
        <div className="border-border bg-muted/80 rounded-lg border">
          <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 [&[data-panel-open]>svg]:rotate-90">
            <HugeiconsIcon
              className="text-muted-foreground size-4 shrink-0 transition-transform"
              icon={ArrowRight01Icon}
            />
            <span className="min-w-0 truncate text-left text-sm font-medium">
              {title}
            </span>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              {showStatusBadge && (
                <Badge className="text-[0.625rem]" variant="outline">
                  {t(`status.${persistedStatus}`)}
                </Badge>
              )}
              <Badge
                className="flex items-center gap-1 text-[0.625rem]"
                variant="secondary"
              >
                <OutputTypeIcon className="size-3" outputType="linkedin_post" />
                {outputTypeLabel("linkedin_post")}
              </Badge>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="mx-2 mb-2 space-y-2">
              <div className="flex justify-center py-4">
                <LinkedInPost
                  accountSelector={{
                    accounts,
                    onSelect: selectAccount,
                  }}
                  author={author}
                  className="w-full max-w-lg"
                  content={draftMarkdown}
                  defaultExpanded
                  onContentChange={
                    isFinished
                      ? undefined
                      : (value) =>
                          dispatch({
                            type: "draftMarkdownChanged",
                            draftMarkdown: value,
                          })
                  }
                  timestamp={tCommon("labels.justNow")}
                  truncate={false}
                />
              </div>
              {regenerateOpen && !isFinished && (
                <input
                  autoFocus
                  className="border-border bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                  onChange={(event) =>
                    dispatch({
                      type: "regenerateInstructionsChanged",
                      instructions: event.target.value,
                    })
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleRegenerate();
                    }
                  }}
                  placeholder={t("regeneratePlaceholder")}
                  value={regenerateInstructions}
                />
              )}
            </div>
          </CollapsibleContent>

          {!isFinished && isOpen && (
            <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
              {userAction === "generating" && (
                <div className="text-muted-foreground mr-auto flex min-w-0 items-center gap-2 text-xs">
                  <BrailleLoader
                    className="text-xs"
                    ariaLabel={t("generatingPost")}
                    label={t("generatingPost")}
                  />
                </div>
              )}
              {effectiveState === "draft" && (
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          aria-label={tCommon("labels.regenerate")}
                          onClick={() =>
                            dispatch({ type: "regenerateOpenToggled" })
                          }
                          size="icon-sm"
                          variant="ghost"
                        />
                      }
                    >
                      <HugeiconsIcon
                        className="size-4"
                        icon={ArrowReloadHorizontalIcon}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      {tCommon("labels.regenerate")}
                    </TooltipContent>
                  </Tooltip>
                  <Button onClick={handleDeny} size="sm" variant="ghost">
                    <HugeiconsIcon className="size-4" icon={Cancel01Icon} />
                    {tCommon("labels.discard")}
                  </Button>
                </div>
              )}
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                <Button
                  loading={effectiveState === "loading"}
                  onClick={handleApprove}
                  size="sm"
                  variant="outline"
                >
                  <HugeiconsIcon
                    className="size-4"
                    icon={CheckmarkSquare01Icon}
                  />
                  {t("saveAsDraft")}
                </Button>
                <PostSocialButton
                  className="max-w-full"
                  content={draftMarkdown}
                  from="chat_preview"
                  onContentChange={
                    isFinished
                      ? undefined
                      : (value) =>
                          dispatch({
                            type: "draftMarkdownChanged",
                            draftMarkdown: value,
                          })
                  }
                  onPublished={onPublished}
                  organizationId={organizationId ?? ""}
                  platform="linkedin"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Collapsible>
  );
}
