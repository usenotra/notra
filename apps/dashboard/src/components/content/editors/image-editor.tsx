"use client";

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

export function ImageEditor({ content, imageExportRef }: ContentEditorProps) {
  const t = useTranslations("content.editors");
  const imageSrc = getImageSrc(content);

  return (
    <TitleCard
      contentClassName="flex min-h-[420px] items-center justify-center overflow-hidden p-0"
      heading={content.title}
    >
      {imageSrc ? (
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
      )}
    </TitleCard>
  );
}
