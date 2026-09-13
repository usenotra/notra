import { POSTHOG_EVENTS } from "@notra/posthog/events";
import type { UIMessage } from "ai";
import type { RefObject } from "react";
import remend from "remend";

import type { EditorRefHandle } from "@/components/content/editor/plugins/editor-ref-plugin";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { getEditMarkdownDiff } from "@/utils/chat-document-diff";

export type ContentChatToolOutputEffect =
  | { type: "track-image-revised"; toolCallId: string }
  | { type: "invalidate-content"; toolCallId: string }
  | {
      type: "apply-image-markdown";
      markdown: string;
      toolCallId: string;
    }
  | {
      type: "apply-markdown-edit";
      fixedMarkdown: string;
      reviewPrevious: string | null;
      toolCallId: string;
      geoWriterPersist?: {
        briefId: string;
        expectedUpdatedAt: string;
        markdown: string;
        workingTitle?: string;
      };
    };

interface CollectContentChatToolOutputEffectsOptions {
  messages: UIMessage[];
  processedToolCalls: ReadonlySet<string>;
  isGeoWriterPlanReviewableNow: boolean;
  geoWriterDraftBriefId: string | undefined;
  geoWriterBriefData:
    | { updatedAt: string; brief: { workingTitle?: string } }
    | undefined;
  editedMarkdown: string | null;
}

interface ApplyContentChatToolOutputHandlers {
  contentId: string;
  contentType: string | null | undefined;
  editedMarkdownRef: RefObject<string | null>;
  editorRef: RefObject<EditorRefHandle | null>;
  geoWriterUpdate: {
    mutate: (
      variables: {
        briefId: string;
        expectedUpdatedAt: string;
        markdown: string;
        workingTitle?: string;
      },
      options?: { onSuccess?: () => void }
    ) => void;
  };
  invalidateContentQueries: () => Promise<unknown>;
  originalMarkdownRef: RefObject<string>;
  setEditedMarkdown: (markdown: string) => void;
  setEditorKey: (updater: (key: number) => number) => void;
  setOriginalMarkdown: (markdown: string) => void;
  setReviewPreviousMarkdown: (markdown: string | null) => void;
  setWriteFocusNonce: (updater: (value: number) => number) => void;
}

export function collectContentChatToolOutputEffects({
  messages,
  processedToolCalls,
  isGeoWriterPlanReviewableNow,
  geoWriterDraftBriefId,
  geoWriterBriefData,
  editedMarkdown,
}: CollectContentChatToolOutputEffectsOptions): ContentChatToolOutputEffect[] {
  const effects: ContentChatToolOutputEffect[] = [];

  let lastAssistantMessage: (typeof messages)[number] | undefined;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "assistant") {
      lastAssistantMessage = message;
      break;
    }
  }
  if (!lastAssistantMessage?.parts) {
    return effects;
  }

  for (const part of lastAssistantMessage.parts) {
    if (part.type !== "tool-editMarkdown" && part.type !== "tool-reviseImage") {
      continue;
    }

    const toolPart = part as {
      toolCallId: string;
      state: string;
      output?: {
        markdown?: string;
        status?: string;
        updatedMarkdown?: string;
      };
    };

    if (processedToolCalls.has(toolPart.toolCallId)) {
      continue;
    }

    if (
      part.type === "tool-reviseImage" &&
      toolPart.state === "output-available" &&
      toolPart.output?.status === "updated"
    ) {
      effects.push({
        type: "track-image-revised",
        toolCallId: toolPart.toolCallId,
      });
      effects.push({
        type: "invalidate-content",
        toolCallId: toolPart.toolCallId,
      });
      continue;
    }

    if (
      toolPart.state === "output-available" &&
      (toolPart.output?.updatedMarkdown !== undefined ||
        toolPart.output?.markdown !== undefined)
    ) {
      const nextMarkdown =
        toolPart.output.updatedMarkdown ?? toolPart.output.markdown;
      if (nextMarkdown === undefined) {
        continue;
      }

      const previousMarkdown =
        getEditMarkdownDiff(toolPart.output)?.previousMarkdown ??
        editedMarkdown ??
        "";
      const fixedMarkdown =
        part.type === "tool-reviseImage" ? nextMarkdown : remend(nextMarkdown);
      const reviewPrevious =
        part.type === "tool-editMarkdown" && previousMarkdown
          ? remend(previousMarkdown)
          : previousMarkdown;

      if (part.type === "tool-editMarkdown") {
        const geoWriterPersist =
          isGeoWriterPlanReviewableNow &&
          geoWriterDraftBriefId &&
          geoWriterBriefData
            ? {
                briefId: geoWriterDraftBriefId,
                expectedUpdatedAt: geoWriterBriefData.updatedAt,
                markdown: fixedMarkdown,
                workingTitle: geoWriterBriefData.brief.workingTitle,
              }
            : undefined;

        effects.push({
          type: "apply-markdown-edit",
          fixedMarkdown,
          reviewPrevious:
            reviewPrevious && reviewPrevious !== fixedMarkdown
              ? reviewPrevious
              : null,
          toolCallId: toolPart.toolCallId,
          geoWriterPersist,
        });
        effects.push({
          type: "invalidate-content",
          toolCallId: toolPart.toolCallId,
        });
      } else {
        effects.push({
          type: "apply-image-markdown",
          markdown: fixedMarkdown,
          toolCallId: toolPart.toolCallId,
        });
        effects.push({
          type: "track-image-revised",
          toolCallId: toolPart.toolCallId,
        });
        effects.push({
          type: "invalidate-content",
          toolCallId: toolPart.toolCallId,
        });
      }
    }
  }

  return effects;
}

export function applyContentChatToolOutputEffect(
  effect: ContentChatToolOutputEffect,
  handlers: ApplyContentChatToolOutputHandlers
): void {
  switch (effect.type) {
    case "track-image-revised":
      trackEvent(POSTHOG_EVENTS.IMAGE_REVISED, {
        content_id: handlers.contentId,
      });
      break;
    case "invalidate-content":
      handlers.invalidateContentQueries().catch((error) => {
        console.error("Failed to refresh edited content", error);
      });
      break;
    case "apply-image-markdown": {
      const editedMarkdownRef = handlers.editedMarkdownRef;
      const editorRef = handlers.editorRef;
      handlers.setEditedMarkdown(effect.markdown);
      editedMarkdownRef.current = effect.markdown;
      editorRef.current?.setMarkdown(effect.markdown);
      trackEvent(POSTHOG_EVENTS.IMAGE_REVISED, {
        content_id: handlers.contentId,
      });
      break;
    }
    case "apply-markdown-edit": {
      const editedMarkdownRef = handlers.editedMarkdownRef;
      const originalMarkdownRef = handlers.originalMarkdownRef;
      handlers.setEditedMarkdown(effect.fixedMarkdown);
      editedMarkdownRef.current = effect.fixedMarkdown;
      if (effect.geoWriterPersist) {
        handlers.setReviewPreviousMarkdown(null);
        handlers.geoWriterUpdate.mutate(effect.geoWriterPersist, {
          onSuccess: () => {
            handlers.setOriginalMarkdown(effect.fixedMarkdown);
            originalMarkdownRef.current = effect.fixedMarkdown;
          },
        });
      } else {
        handlers.setReviewPreviousMarkdown(effect.reviewPrevious);
        handlers.setWriteFocusNonce((value) => value + 1);
        handlers.setEditorKey((key) => key + 1);
      }
      trackEvent(POSTHOG_EVENTS.CONTENT_AGENT_EDIT_APPLIED, {
        content_id: handlers.contentId,
        type: handlers.contentType ?? null,
      });
      break;
    }
    default:
      break;
  }
}
