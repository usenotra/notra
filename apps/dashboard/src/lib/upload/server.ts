import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "@notra/db/drizzle";
import { chatAttachments, members } from "@notra/db/schema";
import {
  ALLOWED_CHAT_MIME_TYPES,
  type AllowedChatMimeType,
  MAX_CHAT_FILE_SIZE,
} from "@notra/schemas/constants/dashboard/upload";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { assertAuthenticated } from "@/lib/auth/organization";
import type {
  UploadPresignedResponse,
  UploadType,
} from "@/types/upload/client";

import { getFileExtension } from "./mime";
import { getR2Config } from "./r2";
import { validateUpload } from "./validate";

const TRAILING_SLASH_REGEX = /\/$/;

interface ResolvedUploadTarget {
  bucketName: string;
  fileSize: number;
  fileType: string;
  key: string;
  publicUrl: string;
}

async function assertUploadAccess({
  headers,
  type,
}: {
  headers: Headers;
  type: UploadType;
}) {
  const { session, user } = await assertAuthenticated({ headers });
  const organizationId = session.activeOrganizationId;

  const requiresOrganization =
    type === "logo" ||
    type === "brand_asset" ||
    type === "content" ||
    type === "chat";

  if (requiresOrganization && !organizationId) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Active organization required for this upload type",
    });
  }

  if (requiresOrganization && organizationId) {
    const membership = await db.query.members.findFirst({
      where: and(
        eq(members.userId, user.id),
        eq(members.organizationId, organizationId)
      ),
      columns: { id: true },
    });

    if (!membership) {
      throw new ORPCError("FORBIDDEN", {
        message: "You do not have access to this organization",
      });
    }
  }

  return {
    organizationId,
    userId: user.id,
  };
}

async function resolveUploadTarget({
  fileSize,
  fileType,
  headers,
  type,
}: {
  fileSize: number;
  fileType: string;
  headers: Headers;
  type: UploadType;
}): Promise<ResolvedUploadTarget> {
  const { organizationId, userId } = await assertUploadAccess({
    headers,
    type,
  });

  validateUpload({
    fileSize,
    fileType,
    type,
  });

  const id = nanoid();
  const extension = getFileExtension(fileType);

  let key: string;

  switch (type) {
    case "avatar":
      key = `user/${userId}/avatar/${id}.${extension}`;
      break;
    case "logo":
      key = `organization/${organizationId}/logo/${id}.${extension}`;
      break;
    case "brand_asset":
      key = `organization/${organizationId}/brand-assets/${id}.${extension}`;
      break;
    case "content":
      key = `organization/${organizationId}/content/${id}.${extension}`;
      break;
    case "chat":
      key = `organization/${organizationId}/chat/${id}.${extension}`;
      break;
    default:
      throw new ORPCError("BAD_REQUEST", {
        message: "Unsupported upload type",
      });
  }

  const { bucketName, publicUrl } = getR2Config();
  const normalizedPublicUrl = publicUrl.replace(TRAILING_SLASH_REGEX, "");

  return {
    bucketName,
    fileSize,
    fileType,
    key,
    publicUrl: `${normalizedPublicUrl}/${key}`,
  };
}

export async function createPresignedUpload({
  fileSize,
  fileType,
  headers,
  type,
}: {
  fileSize: number;
  fileType: string;
  headers: Headers;
  type: UploadType;
}): Promise<UploadPresignedResponse> {
  const target = await resolveUploadTarget({
    fileSize,
    fileType,
    headers,
    type,
  });
  const { client: r2Client } = getR2Config();
  const url = await getSignedUrl(
    r2Client,
    new PutObjectCommand({
      Bucket: target.bucketName,
      Key: target.key,
      ContentLength: target.fileSize,
      ContentType: target.fileType,
    }),
    { expiresIn: 3600 }
  );

  return {
    key: target.key,
    publicUrl: target.publicUrl,
    url,
  };
}

export async function deleteChatUpload({
  key,
  headers,
}: {
  key: string;
  headers: Headers;
}) {
  const { organizationId } = await assertUploadAccess({
    headers,
    type: "chat",
  });

  if (!organizationId) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Active organization required for this upload type",
    });
  }

  const expectedPrefix = `organization/${organizationId}/chat/`;
  if (!key.startsWith(expectedPrefix)) {
    throw new ORPCError("FORBIDDEN", {
      message: "You do not have access to this chat upload",
    });
  }

  await db
    .delete(chatAttachments)
    .where(
      and(
        eq(chatAttachments.organizationId, organizationId),
        eq(chatAttachments.key, key)
      )
    );

  const { client: r2Client, bucketName } = getR2Config();
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );

  return { success: true };
}

export async function recordChatAttachment({
  key,
  filename,
  mediaType,
  size,
  headers,
}: {
  key: string;
  filename: string;
  mediaType: string;
  size: number;
  headers: Headers;
}) {
  const { userId, organizationId } = await assertUploadAccess({
    headers,
    type: "chat",
  });

  if (!organizationId) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Active organization required for this upload type",
    });
  }

  const expectedPrefix = `organization/${organizationId}/chat/`;

  if (!key.startsWith(expectedPrefix)) {
    throw new ORPCError("FORBIDDEN", {
      message: "You do not have access to this chat upload",
    });
  }

  if (!ALLOWED_CHAT_MIME_TYPES.includes(mediaType as AllowedChatMimeType)) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Media type ${mediaType} is not allowed in chat`,
    });
  }

  if (size > MAX_CHAT_FILE_SIZE) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Attachment exceeds maximum size of ${MAX_CHAT_FILE_SIZE / 1024 / 1024}MB`,
    });
  }

  await db
    .insert(chatAttachments)
    .values({
      id: nanoid(),
      organizationId,
      userId,
      key,
      filename,
      mediaType,
      size,
    })
    .onConflictDoNothing({ target: chatAttachments.key });

  return { success: true };
}
