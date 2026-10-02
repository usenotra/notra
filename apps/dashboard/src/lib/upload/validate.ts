import {
  ALLOWED_CHAT_MIME_TYPES,
  ALLOWED_MIME_TYPES,
  ALLOWED_RASTER_MIME_TYPES,
  ALLOWED_VIDEO_MIME_TYPES,
  MAX_AVATAR_FILE_SIZE,
  MAX_BRAND_ASSET_FILE_SIZE,
  MAX_CHAT_FILE_SIZE,
  MAX_CONTENT_FILE_SIZE,
  MAX_LOGO_FILE_SIZE,
  SVG_MIME_TYPE,
} from "@notra/schemas/constants/dashboard/upload";
import { ORPCError } from "@orpc/server";
import { getTranslations } from "next-intl/server";

import { MAX_CONTENT_VIDEO_BYTES } from "@/constants/content-video";
import type { UploadType } from "@/types/upload/client";

const BYTES_PER_MEGABYTE = 1024 * 1024;

const maxSizeByType = {
  avatar: MAX_AVATAR_FILE_SIZE,
  brand_asset: MAX_BRAND_ASSET_FILE_SIZE,
  logo: MAX_LOGO_FILE_SIZE,
  content: MAX_CONTENT_FILE_SIZE,
  chat: MAX_CHAT_FILE_SIZE,
};

function isAllowedFileType(type: UploadType, fileType: string): boolean {
  switch (type) {
    case "avatar":
    case "logo":
      return ALLOWED_RASTER_MIME_TYPES.some(
        (mimeType) => mimeType === fileType
      );
    case "brand_asset":
      return (
        fileType !== SVG_MIME_TYPE &&
        ALLOWED_MIME_TYPES.some((mimeType) => mimeType === fileType)
      );
    case "content":
      return (
        fileType !== SVG_MIME_TYPE &&
        (ALLOWED_MIME_TYPES.some((mimeType) => mimeType === fileType) ||
          ALLOWED_VIDEO_MIME_TYPES.some((mimeType) => mimeType === fileType))
      );
    case "chat":
      return ALLOWED_CHAT_MIME_TYPES.some((mimeType) => mimeType === fileType);
    default:
      return false;
  }
}

export async function validateUpload({
  type,
  fileType,
  fileSize,
}: {
  type: UploadType;
  fileType: string;
  fileSize: number;
}) {
  const isVideo =
    type === "content" &&
    ALLOWED_VIDEO_MIME_TYPES.some((mimeType) => mimeType === fileType);
  const maxSize = isVideo
    ? Math.min(maxSizeByType[type], MAX_CONTENT_VIDEO_BYTES)
    : maxSizeByType[type];
  if (fileSize > maxSize) {
    const tErrors = await getTranslations("errors.upload");
    throw new ORPCError("BAD_REQUEST", {
      message: tErrors("fileTooLarge", {
        maxMb: maxSize / BYTES_PER_MEGABYTE,
      }),
    });
  }
  if (!isAllowedFileType(type, fileType)) {
    const tErrors = await getTranslations("errors.upload");
    throw new ORPCError("BAD_REQUEST", {
      message: tErrors("fileTypeNotAllowed"),
    });
  }
}
