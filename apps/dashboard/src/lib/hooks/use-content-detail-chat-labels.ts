"use client";

import type { ContentResponse } from "@notra/schemas/dashboard/content";
import { useTranslations } from "use-intl";

import { getImageExcalidrawUrl } from "@/utils/image-content";

export function useContentDetailChatLabels(
  content: ContentResponse | undefined,
  isPlanReviewable: boolean
) {
  const tPlan = useTranslations("content.plan");
  const tImageChat = useTranslations("content.imageChat");

  if (isPlanReviewable) {
    return { placeholder: tPlan("chatPlaceholder") };
  }
  if (content?.contentType !== "image") {
    return {};
  }

  const isDiagram = getImageExcalidrawUrl(content) !== null;
  return {
    placeholder: tImageChat(
      isDiagram ? "diagramPlaceholder" : "imagePlaceholder"
    ),
    editingTarget: {
      title: content.title,
      description: tImageChat(isDiagram ? "editingDiagram" : "editingImage", {
        title: content.title,
      }),
    },
  };
}
