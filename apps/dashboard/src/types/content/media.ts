import type { useTranslations } from "next-intl";

import type { CONTENT_MEDIA } from "@/constants/content-media";

export type ContentMediaKind = keyof typeof CONTENT_MEDIA;

export type UploadTranslator = ReturnType<
  typeof useTranslations<"content.editor.upload">
>;
