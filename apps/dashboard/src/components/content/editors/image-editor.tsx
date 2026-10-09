"use client";

import { readImageFormat } from "@notra/ai/utils/diagram-metadata";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useTranslations } from "use-intl";

import Image from "@/components/framework/image";
import { isHttpImageContent } from "@/utils/image-content";
import { extractMarkdownImageSrc } from "@/utils/markdown-image";

import type { ContentEditorProps } from "./types";

function getImageSrc(content: ContentEditorProps["content"]): string | null {
  if (isHttpImageContent(content.content)) {
    return content.content;
  }

  return extractMarkdownImageSrc(content.markdown ?? "");
}

export function ImageEditor({
  content,
  imageExportRef,
}: Pick<ContentEditorProps, "content" | "imageExportRef">) {
  const t = useTranslations("content.editors");
  const imageSrc = getImageSrc(content);

  const imagePreview = imageSrc ? (
    <div
      className="flex w-full items-center justify-center"
      ref={imageExportRef}
    >
      <Image
        alt={content.title}
        className="h-auto max-h-[calc(100vh-260px)] w-full object-contain"
        height={630}
        src={imageSrc}
        unoptimized
        width={1200}
      />
    </div>
  ) : (
    <div className="text-muted-foreground px-4 py-12 text-center text-sm">
      {t("imageUnavailable")}
    </div>
  );

  if (readImageFormat(content.sourceMetadata) === "diagram") {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-medium text-balance break-words">
          {content.title}
        </h1>
        {imagePreview}
      </div>
    );
  }

  return (
    <TitleCard
      contentClassName="flex min-h-[420px] items-center justify-center overflow-hidden p-0"
      heading={content.title}
    >
      {imagePreview}
    </TitleCard>
  );
}
