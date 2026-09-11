import {
  ALLOWED_CHAT_MIME_TYPES,
  ALLOWED_MIME_TYPES,
  ALLOWED_RASTER_MIME_TYPES,
  type AllowedChatMimeType,
  type AllowedRasterMimeType,
  MAX_AVATAR_FILE_SIZE,
  MAX_BRAND_ASSET_FILE_SIZE,
  MAX_CHAT_FILE_SIZE,
  MAX_CONTENT_FILE_SIZE,
  MAX_LOGO_FILE_SIZE,
  SVG_MIME_TYPE,
} from "@notra/schemas/constants/dashboard/upload";
import { ORPCError } from "@orpc/server";

import type { UploadType } from "@/types/upload/client";

const maxSizeByType = {
  avatar: MAX_AVATAR_FILE_SIZE,
  brand_asset: MAX_BRAND_ASSET_FILE_SIZE,
  logo: MAX_LOGO_FILE_SIZE,
  content: MAX_CONTENT_FILE_SIZE,
  chat: MAX_CHAT_FILE_SIZE,
};

function assertAllowedGeneralUploadType(fileType: string, label: string) {
  if (fileType === SVG_MIME_TYPE) {
    throw new ORPCError("BAD_REQUEST", {
      message: "SVG uploads must use the dedicated SVG upload endpoint",
    });
  }
  if (!ALLOWED_MIME_TYPES.some((mimeType) => mimeType === fileType)) {
    throw new ORPCError("BAD_REQUEST", {
      message: `File type ${fileType} is not allowed for ${label}. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
    });
  }
}

export function validateUpload({
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
    throw new ORPCError("BAD_REQUEST", {
      message: `File size exceeds the maximum limit of ${maxSize / 1024 / 1024}MB for ${type}.`,
    });
  }
  switch (type) {
    case "avatar":
    case "logo":
      if (
        !ALLOWED_RASTER_MIME_TYPES.includes(fileType as AllowedRasterMimeType)
      ) {
        throw new ORPCError("BAD_REQUEST", {
          message: `File type ${fileType} is not allowed for ${type}. Allowed raster types: ${ALLOWED_RASTER_MIME_TYPES.join(", ")}`,
        });
      }
      break;
    case "brand_asset":
      assertAllowedGeneralUploadType(fileType, "brand assets");
      break;
    case "content":
      assertAllowedGeneralUploadType(fileType, "content");
      break;
    case "chat":
      if (!ALLOWED_CHAT_MIME_TYPES.includes(fileType as AllowedChatMimeType)) {
        throw new ORPCError("BAD_REQUEST", {
          message: `File type ${fileType} is not allowed in chat. Allowed types: ${ALLOWED_CHAT_MIME_TYPES.join(", ")}`,
        });
      }
      break;
    default:
      throw new ORPCError("BAD_REQUEST", { message: "Invalid upload type." });
  }
}
