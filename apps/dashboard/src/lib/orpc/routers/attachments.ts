import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { db } from "@notra/db/drizzle";
import { chatAttachments, members } from "@notra/db/schema";
import {
  type AttachmentFilter,
  deleteManyAttachmentsInputSchema,
  listAttachmentsInputSchema,
} from "@notra/schemas/dashboard/attachments";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, inArray, lt, notInArray, or } from "drizzle-orm";

import { authorizedProcedure } from "@/lib/orpc/base";
import {
  getOptionalR2PublicUrl,
  getR2StorageConfig,
  isR2StorageConfigured,
} from "@/lib/upload/r2";

const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/svg+xml",
] as const;
const TEXT_MIME_TYPES = ["text/plain", "text/markdown"] as const;
const KNOWN_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  "application/pdf",
  ...TEXT_MIME_TYPES,
] as const;

const LIST_PAGE_SIZE = 100;

function buildFilterCondition(
  organizationId: string,
  filter: AttachmentFilter
) {
  const orgCondition = eq(chatAttachments.organizationId, organizationId);

  if (filter === "image") {
    return and(
      orgCondition,
      inArray(chatAttachments.mediaType, [...IMAGE_MIME_TYPES])
    );
  }
  if (filter === "pdf") {
    return and(orgCondition, eq(chatAttachments.mediaType, "application/pdf"));
  }
  if (filter === "text") {
    return and(
      orgCondition,
      inArray(chatAttachments.mediaType, [...TEXT_MIME_TYPES])
    );
  }
  if (filter === "other") {
    return and(
      orgCondition,
      notInArray(chatAttachments.mediaType, [...KNOWN_MIME_TYPES])
    );
  }
  return orgCondition;
}

async function deleteR2Keys(keys: string[]) {
  if (keys.length === 0 || !isR2StorageConfigured()) {
    return;
  }
  const { client, bucketName } = getR2StorageConfig();
  const MAX = 1000;
  for (let i = 0; i < keys.length; i += MAX) {
    const chunk = keys.slice(i, i + MAX);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: true,
        },
      })
    );
  }
}

function buildPublicUrl(key: string) {
  const base = getOptionalR2PublicUrl();
  return base ? `${base}/${key}` : "";
}

async function requireOrganizationAccess(
  userId: string,
  organizationId: string | null | undefined
) {
  if (!organizationId) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Active organization required",
    });
  }

  const membership = await db.query.members.findFirst({
    where: and(
      eq(members.userId, userId),
      eq(members.organizationId, organizationId)
    ),
    columns: { id: true },
  });

  if (!membership) {
    throw new ORPCError("FORBIDDEN", {
      message: "You do not have access to this organization",
    });
  }

  return organizationId;
}

export const attachmentsRouter = {
  list: authorizedProcedure
    .input(listAttachmentsInputSchema)
    .handler(async ({ context, input }) => {
      const organizationId = await requireOrganizationAccess(
        context.user.id,
        input.organizationId
      );

      const filterCondition = buildFilterCondition(
        organizationId,
        input.filter
      );
      const cursorCondition = input.cursor
        ? or(
            lt(chatAttachments.createdAt, new Date(input.cursor.createdAt)),
            and(
              eq(chatAttachments.createdAt, new Date(input.cursor.createdAt)),
              lt(chatAttachments.id, input.cursor.id)
            )
          )
        : undefined;

      const rows = await db
        .select()
        .from(chatAttachments)
        .where(
          cursorCondition
            ? and(filterCondition, cursorCondition)
            : filterCondition
        )
        .orderBy(desc(chatAttachments.createdAt), desc(chatAttachments.id))
        .limit(LIST_PAGE_SIZE + 1)
        .$withCache(false);

      const hasMore = rows.length > LIST_PAGE_SIZE;
      const page = hasMore ? rows.slice(0, LIST_PAGE_SIZE) : rows;
      const lastRow = page.at(-1);
      const nextCursor =
        hasMore && lastRow
          ? { createdAt: lastRow.createdAt.toISOString(), id: lastRow.id }
          : null;

      return {
        attachments: page.map((row) => ({
          id: row.id,
          key: row.key,
          filename: row.filename,
          mediaType: row.mediaType,
          size: row.size,
          createdAt: row.createdAt.toISOString(),
          url: buildPublicUrl(row.key),
        })),
        nextCursor,
      };
    }),
  deleteMany: authorizedProcedure
    .input(deleteManyAttachmentsInputSchema)
    .handler(async ({ context, input }) => {
      const organizationId = await requireOrganizationAccess(
        context.user.id,
        input.organizationId
      );

      const owned = await db
        .select({ key: chatAttachments.key })
        .from(chatAttachments)
        .where(
          and(
            eq(chatAttachments.organizationId, organizationId),
            inArray(chatAttachments.key, input.keys)
          )
        );

      const ownedKeys = owned.map((row) => row.key);
      if (ownedKeys.length === 0) {
        return { success: true, deleted: 0 };
      }

      await deleteR2Keys(ownedKeys);
      await db
        .delete(chatAttachments)
        .where(
          and(
            eq(chatAttachments.organizationId, organizationId),
            inArray(chatAttachments.key, ownedKeys)
          )
        );

      return { success: true, deleted: ownedKeys.length };
    }),
};
