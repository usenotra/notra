import type { UIMessage } from "ai";
import type { RefObject } from "react";
import remend from "remend";

import { getEditMarkdownDiff } from "@/utils/chat-document-diff";

export type ContentChatToolOutputEffect =
  | { type: "track-image-revised" }
  | { type: "invalidate-content" }
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
  processedToolCalls: Set<string>;
  isGeoWriterPlanReviewableNow: boolean;
  geoWriterDraftBriefId: string | undefined;
  geoWriterBriefData:
    | { updatedAt: string; brief: { workingTitle?: string } }
    | undefined;
  editedMarkdownRef: RefObject<string | null>;
}

export function collectContentChatToolOutputEffects({
  messages,
  processedToolCalls,
  isGeoWriterPlanReviewableNow,
  geoWriterDraftBriefId,
  geoWriterBriefData,
  editedMarkdownRef,
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
      processedToolCalls.add(toolPart.toolCallId);
      effects.push({ type: "track-image-revised" });
      effects.push({ type: "invalidate-content" });
      continue;
    }

    if (
      toolPart.state === "output-available" &&
      (toolPart.output?.updatedMarkdown || toolPart.output?.markdown)
    ) {
      const nextMarkdown =
        toolPart.output.updatedMarkdown || toolPart.output.markdown;
      if (!nextMarkdown) {
        continue;
      }

      processedToolCalls.add(toolPart.toolCallId);

      const previousMarkdown =
        getEditMarkdownDiff(toolPart.output)?.previousMarkdown ??
        editedMarkdownRef.current ??
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
        effects.push({ type: "invalidate-content" });
      } else {
        effects.push({
          type: "apply-image-markdown",
          markdown: fixedMarkdown,
          toolCallId: toolPart.toolCallId,
        });
        effects.push({ type: "track-image-revised" });
        effects.push({ type: "invalidate-content" });
      }
    }
  }

  return effects;
}
