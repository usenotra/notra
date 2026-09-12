import {
  ALLOWED_CHAT_MIME_TYPES,
  type AllowedChatMimeType,
  SVG_MIME_TYPE,
} from "@notra/schemas/constants/dashboard/upload";

import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  DeleteChatUploadProps,
  UploadFileProps,
  UploadFileResponse,
  UploadPresignedResponse,
  UploadType,
} from "@/types/upload/client";

async function getPresignedUrl(
  file: File,
  type: UploadType
): Promise<UploadPresignedResponse> {
  return dashboardOrpc.upload.createPresignedUpload.call({
    type,
    fileType: file.type,
    fileSize: file.size,
  });
}

async function uploadToR2(presignedUrl: string, file: File) {
  const response = await fetch(presignedUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed (${response.status})`);
  }
}

async function uploadSvgThroughServer(
  file: File,
  type: "brand_asset" | "content"
): Promise<UploadFileResponse> {
  const svg = await file.text();
  const { key, publicUrl } = await dashboardOrpc.upload.uploadSvg.call({
    type,
    svg,
  });
  return { url: publicUrl, key };
}

export async function uploadFile({
  file,
  type,
}: UploadFileProps): Promise<UploadFileResponse> {
  if (
    (type === "content" || type === "brand_asset") &&
    file.type === SVG_MIME_TYPE
  ) {
    return uploadSvgThroughServer(file, type);
  }

  const { url, key, publicUrl } = await getPresignedUrl(file, type);
  await uploadToR2(url, file);

  if (
    type === "chat" &&
    ALLOWED_CHAT_MIME_TYPES.includes(file.type as AllowedChatMimeType)
  ) {
    try {
      await dashboardOrpc.upload.recordChatAttachment.call({
        key,
        filename: file.name,
        mediaType: file.type as AllowedChatMimeType,
        size: file.size,
      });
    } catch (error) {
      console.error("Failed to record chat attachment", { key, error });
    }
  }

  return { url: publicUrl, key };
}

export async function deleteChatUpload({
  key,
}: DeleteChatUploadProps): Promise<void> {
  await dashboardOrpc.upload.deleteChatUpload.call({ key });
}
