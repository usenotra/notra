import {
  ALLOWED_CHAT_MIME_TYPES,
  ALLOWED_MIME_TYPES,
  ALLOWED_RASTER_MIME_TYPES,
  type AllowedChatMimeType,
  BRAND_GUIDELINE_PDF_MIME_TYPE,
  MAX_AVATAR_FILE_SIZE,
  MAX_BRAND_ASSET_FILE_SIZE,
  MAX_BRAND_GUIDELINE_PDF_FILE_SIZE,
  MAX_CHAT_FILE_SIZE,
  MAX_CONTENT_FILE_SIZE,
  MAX_LOGO_FILE_SIZE,
  SVG_MIME_TYPE,
} from "@notra/schemas/constants/dashboard/upload";
import { ORPCError } from "@orpc/server";

import { getTranslations } from "@/lib/i18n/server";
import type { UploadType } from "@/types/upload/client";

const BYTES_PER_MEGABYTE = 1024 * 1024;

const maxSizeByType = {
  avatar: MAX_AVATAR_FILE_SIZE,
  brand_asset: MAX_BRAND_ASSET_FILE_SIZE,
  brand_guideline_pdf: MAX_BRAND_GUIDELINE_PDF_FILE_SIZE,
  logo: MAX_LOGO_FILE_SIZE,
  content: MAX_CONTENT_FILE_SIZE,
  chat: MAX_CHAT_FILE_SIZE,
};

export async function validateUpload({
  type,
  fileType,
  fileSize,
}: {
  type: UploadType;
  fileType: string;
  fileSize: number;
}) {
  const maxSize = maxSizeByType[type];
  if (fileSize > maxSize) {
    const tErrors = await getTranslations("errors.upload");
    throw new ORPCError("BAD_REQUEST", {
      message: tErrors("fileTooLarge", {
        maxMb: maxSize / BYTES_PER_MEGABYTE,
      }),
    });
  }
  const tErrors = await getTranslations("errors.upload");
  const notAllowed = () =>
    new ORPCError("BAD_REQUEST", {
      message: tErrors("fileTypeNotAllowed"),
    });
  switch (type) {
    case "avatar":
    case "logo":
      if (
        !ALLOWED_RASTER_MIME_TYPES.includes(
          fileType as (typeof ALLOWED_RASTER_MIME_TYPES)[number]
        )
      ) {
        throw notAllowed();
      }
      break;
    case "brand_asset":
    case "content":
      if (
        fileType === SVG_MIME_TYPE ||
        !ALLOWED_MIME_TYPES.some((mimeType) => mimeType === fileType)
      ) {
        throw notAllowed();
      }
      break;
    case "brand_guideline_pdf":
      if (fileType !== BRAND_GUIDELINE_PDF_MIME_TYPE) {
        throw notAllowed();
      }
      break;
    case "chat":
      if (!ALLOWED_CHAT_MIME_TYPES.includes(fileType as AllowedChatMimeType)) {
        throw notAllowed();
      }
      break;
    default:
      throw notAllowed();
  }
}
