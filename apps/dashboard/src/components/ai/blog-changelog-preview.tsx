"use client";

import {
  ArrowReloadHorizontalIcon,
  ArrowRight01Icon,
  Cancel01Icon,
  CheckmarkSquare01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CHAT_PREVIEW_SAVE_TIMEOUT_MS } from "@notra/ai/constants/chat";
import type { ContentType } from "@notra/ai/schemas/content";
import { BrailleLoader } from "@notra/ui/components/shared/braille-loader";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useReducer } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { LexicalEditor } from "@/components/content/editor/lexical-editor";
import type {
  BlogChangelogPreviewAction,
  BlogChangelogPreviewState,
  PreviewIncomingState,
} from "@/types/content/ai-preview";
import {
  blogPreviewEffectiveState,
  isBlogPreviewBusy,
} from "@/utils/blog-preview-state";
import { getOutputTypeLabel, OutputTypeIcon } from "@/utils/output-types";

function blogChangelogPreviewReducer(
  state: BlogChangelogPreviewState,
  action: BlogChangelogPreviewAction
): BlogChangelogPreviewState {
  switch (action.type) {
    case "userActionChanged":
      return { ...state, userAction: action.userAction };
    case "draftTitleChanged":
      return { ...state, draftTitle: action.draftTitle };
    case "draftMarkdownChanged":
      return { ...state, draftMarkdown: action.draftMarkdown };
    case "regenerateOpenChanged":
      return { ...state, regenerateOpen: action.open };
    case "regenerateOpenToggled":
      return { ...state, regenerateOpen: !state.regenerateOpen };
    case "regenerateInstructionsChanged":
      return { ...state, regenerateInstructions: action.instructions };
    case "openChanged":
      return { ...state, isOpen: action.open };
    default:
      return state;
  }
}

interface BlogChangelogPreviewProps {
  state: PreviewIncomingState;
  title: string;
  markdown: string;
  contentType: Extract<
    ContentType,
    "blog_post" | "changelog" | "investor_update"
  >;
  persistedStatus?: "draft" | "published";
  readOnly?: boolean;
  onApprove?: () => void;
  onDeny?: () => void;
  onPersist?: (
    status: "draft" | "published",
    payload: { title: string; markdown: string }
  ) => Promise<void>;
  onRegenerate?: (
    instructions: string,
    payload: { title: string; markdown: string }
  ) => void;
}

export function BlogChangelogPreview({
  state: incomingState,
  title,
  markdown,
  contentType,
  persistedStatus = "draft",
  readOnly = false,
  onApprove,
  onDeny,
  onPersist,
  onRegenerate,
}: BlogChangelogPreviewProps) {
  const [
    {
      userAction,
      draftTitle,
      draftMarkdown,
      regenerateOpen,
      regenerateInstructions,
      isOpen,
    },
    dispatch,
  ] = useReducer(blogChangelogPreviewReducer, {
    userAction: "none",
    draftTitle: title,
    draftMarkdown: markdown,
    regenerateOpen: false,
    regenerateInstructions: "",
    isOpen: incomingState !== "finished",
  });

  useEffect(() => {
    dispatch({ type: "draftTitleChanged", draftTitle: title });
  }, [title]);

  useEffect(() => {
    dispatch({ type: "draftMarkdownChanged", draftMarkdown: markdown });
  }, [markdown]);

  const effectiveState = blogPreviewEffectiveState(incomingState, userAction);

  useEffect(() => {
    if (!isBlogPreviewBusy(userAction)) {
      return;
    }
    const timer = window.setTimeout(() => {
      dispatch({ type: "userActionChanged", userAction: "save-failed" });
    }, CHAT_PREVIEW_SAVE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [userAction]);

  const handleApprove = useCallback(async () => {
    dispatch({ type: "userActionChanged", userAction: "saving" });
    dispatch({ type: "openChanged", open: false });
    const toastId = toast.loading("Saving draft...");
    try {
      if (onPersist) {
        await onPersist("draft", {
          title: draftTitle,
          markdown: draftMarkdown,
        });
      } else if (onApprove) {
        onApprove();
      }
      dispatch({ type: "userActionChanged", userAction: "none" });
      toast.success("Saved as draft", { id: toastId });
    } catch {
      dispatch({ type: "userActionChanged", userAction: "save-failed" });
      toast.error("Failed to save draft", { id: toastId });
    }
  }, [draftMarkdown, draftTitle, onApprove, onPersist]);

  const handlePublish = useCallback(async () => {
    dispatch({ type: "userActionChanged", userAction: "publishing" });
    dispatch({ type: "openChanged", open: false });
    const toastId = toast.loading("Publishing post...");
    try {
      if (!onPersist) {
        dispatch({ type: "userActionChanged", userAction: "save-failed" });
        toast.error("Publish is not available", { id: toastId });
        return;
      }
      await onPersist("published", {
        title: draftTitle,
        markdown: draftMarkdown,
      });
      dispatch({ type: "userActionChanged", userAction: "none" });
      toast.success("Post published", { id: toastId });
    } catch {
      dispatch({ type: "userActionChanged", userAction: "save-failed" });
      toast.error("Failed to publish post", { id: toastId });
    }
  }, [draftMarkdown, draftTitle, onPersist]);

  const handleDeny = useCallback(() => {
    onDeny?.();
    toast("Canceled");
  }, [onDeny]);

  const handleRegenerate = useCallback(() => {
    const instructions = regenerateInstructions.trim();
    if (!instructions) {
      dispatch({ type: "regenerateOpenChanged", open: true });
      return;
    }
    dispatch({ type: "userActionChanged", userAction: "generating" });
    toast("Generating post...");
    onRegenerate?.(instructions, {
      title: draftTitle,
      markdown: draftMarkdown,
    });
  }, [draftMarkdown, draftTitle, onRegenerate, regenerateInstructions]);

  const isFinished = effectiveState === "finished";
  const isEditable = !isFinished && !readOnly;
  const showStatusBadge = isFinished && userAction !== "save-failed";

  return (
    <Collapsible
      onOpenChange={(open) => dispatch({ type: "openChanged", open })}
      open={isOpen}
    >
      <div className="ml-px max-w-xl">
        <div className="border-border bg-muted/80 rounded-lg border">
          <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 [&[data-panel-open]>svg]:rotate-90">
            <HugeiconsIcon
              className="text-muted-foreground size-4 shrink-0 transition-transform"
              icon={ArrowRight01Icon}
            />
            <span className="min-w-0 truncate text-left text-sm font-medium">
              {draftTitle}
            </span>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              {showStatusBadge && (
                <Badge className="text-[0.625rem]" variant="outline">
                  {persistedStatus}
                </Badge>
              )}
              <Badge
                className="flex items-center gap-1 text-[0.625rem] capitalize"
                variant="secondary"
              >
                <OutputTypeIcon className="size-3" outputType={contentType} />
                {getOutputTypeLabel(contentType)}
              </Badge>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="mx-2 mb-2 space-y-2">
              {isEditable && (
                <input
                  aria-label="Post title"
                  className="border-border bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                  onChange={(event) =>
                    dispatch({
                      type: "draftTitleChanged",
                      draftTitle: event.target.value,
                    })
                  }
                  value={draftTitle}
                />
              )}
              <Tabs defaultValue="markdown">
                <TabsList variant="line">
                  <TabsTrigger value="markdown">Markdown</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent className="mt-2" value="markdown">
                  <textarea
                    aria-label="Post content"
                    className="border-border bg-background focus-visible:ring-ring field-sizing-content max-h-80 min-h-72 w-full resize-none overflow-y-auto rounded-md border px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2"
                    onChange={(event) =>
                      dispatch({
                        type: "draftMarkdownChanged",
                        draftMarkdown: event.target.value,
                      })
                    }
                    readOnly={!isEditable}
                    value={draftMarkdown}
                  />
                </TabsContent>
                <TabsContent className="mt-2" value="preview">
                  <div className="border-border/80 bg-background max-h-[24rem] overflow-y-auto rounded-lg border px-4 py-3">
                    <LexicalEditor
                      editable={isEditable}
                      initialMarkdown={draftMarkdown}
                      onChange={(value) =>
                        dispatch({
                          type: "draftMarkdownChanged",
                          draftMarkdown: value,
                        })
                      }
                      onSelectionChange={() => null}
                    />
                  </div>
                </TabsContent>
              </Tabs>
              {regenerateOpen && isEditable && (
                <input
                  aria-label="Regeneration instructions"
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
                  placeholder="What should change?"
                  value={regenerateInstructions}
                />
              )}
            </div>
          </CollapsibleContent>

          {isEditable && isOpen && (
            <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
              {userAction === "generating" && (
                <div className="text-muted-foreground mr-auto flex min-w-0 items-center gap-2 text-xs">
                  <BrailleLoader className="text-xs" label="Generating post" />
                </div>
              )}
              {effectiveState === "draft" && (
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          aria-label="Regenerate"
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
                    <TooltipContent>Regenerate</TooltipContent>
                  </Tooltip>
                  <Button onClick={handleDeny} size="sm" variant="ghost">
                    <HugeiconsIcon className="size-4" icon={Cancel01Icon} />
                    Discard
                  </Button>
                </div>
              )}
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                <Button
                  disabled={effectiveState === "loading"}
                  onClick={handleApprove}
                  size="sm"
                  variant="outline"
                >
                  {effectiveState === "loading" ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      Saving
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon
                        className="size-4"
                        icon={CheckmarkSquare01Icon}
                      />
                      Save as draft
                    </>
                  )}
                </Button>
                <Button
                  disabled={effectiveState === "loading"}
                  onClick={handlePublish}
                  size="sm"
                >
                  {effectiveState === "loading" &&
                  userAction === "publishing" ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      Publishing
                    </>
                  ) : (
                    "Publish"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Collapsible>
  );
}
