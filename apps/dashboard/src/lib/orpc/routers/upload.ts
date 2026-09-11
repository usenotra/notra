import { PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@notra/db/drizzle";
import { members } from "@notra/db/schema";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { SVG_MIME_TYPE } from "@notra/schemas/constants/dashboard/upload";
import {
  deleteChatUploadSchema,
  recordChatAttachmentSchema,
  uploadLogoFromUrlSchema,
  uploadSchema,
  uploadSvgSchema,
} from "@notra/schemas/dashboard/upload";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import {
  COMPANY_LOGO_FETCH_TIMEOUT_MS,
  COMPANY_LOGO_SOURCE_HOSTS,
} from "@/constants/company-logo";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { getChatAttachmentSizeBucket } from "@/lib/analytics/studio-events";
import { authorizedProcedure } from "@/lib/orpc/base";
import { getFileExtension } from "@/lib/upload/mime";
import { getR2Config } from "@/lib/upload/r2";
import { SvgSanitizationError, sanitizeSvg } from "@/lib/upload/sanitize-svg";
import {
  createPresignedUpload,
  deleteChatUpload,
  recordChatAttachment,
} from "@/lib/upload/server";
import { validateUpload } from "@/lib/upload/validate";

import { badRequest, forbidden, unauthorized } from "../utils/errors";

const TRAILING_SLASH_REGEX = /\/$/;

export const uploadRouter = {
  createPresignedUpload: authorizedProcedure
    .input(uploadSchema)
    .handler(async ({ context, input }) => {
      return createPresignedUpload({
        fileSize: input.fileSize,
        fileType: input.fileType,
        headers: context.headers,
        type: input.type,
      });
    }),
  deleteChatUpload: authorizedProcedure
    .input(deleteChatUploadSchema)
    .handler(async ({ context, input }) => {
      return deleteChatUpload({
        headers: context.headers,
        key: input.key,
      });
    }),
  recordChatAttachment: authorizedProcedure
    .input(recordChatAttachmentSchema)
    .handler(async ({ context, input }) => {
      const result = await recordChatAttachment({
        headers: context.headers,
        key: input.key,
        filename: input.filename,
        mediaType: input.mediaType,
        size: input.size,
      });

      trackServerEvent({
        event: POSTHOG_EVENTS.CHAT_ATTACHMENT_UPLOADED,
        headers: context.headers,
        userId: context.user.id,
        organizationId: context.session?.activeOrganizationId ?? null,
        properties: {
          mime: input.mediaType,
          size_bucket: getChatAttachmentSizeBucket(input.size),
        },
      });

      return result;
    }),
  logoFromUrl: authorizedProcedure
    .input(uploadLogoFromUrlSchema)
    .handler(async ({ context, input }) => {
      const orgId = context.session?.activeOrganizationId;

      if (!orgId) {
        throw unauthorized("Active organization required for logo upload");
      }

      const membership = await db.query.members.findFirst({
        where: and(
          eq(members.userId, context.user.id),
          eq(members.organizationId, orgId)
        ),
        columns: { id: true },
      });

      if (!membership) {
        throw forbidden("You do not have access to this organization");
      }

      const sourceUrl = new URL(input.sourceUrl);
      const isAllowedSource =
        sourceUrl.protocol === "https:" &&
        COMPANY_LOGO_SOURCE_HOSTS.some((host) => host === sourceUrl.hostname);

      if (!isAllowedSource) {
        throw badRequest("Logo source is not allowed");
      }

      const response = await fetch(sourceUrl, {
        signal: AbortSignal.timeout(COMPANY_LOGO_FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw badRequest("Could not fetch the logo image");
      }

      const fileType =
        response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
      const body = Buffer.from(await response.arrayBuffer());

      validateUpload({
        type: "logo",
        fileType,
        fileSize: body.byteLength,
      });

      const id = nanoid();
      const key = `organization/${orgId}/logo/${id}.${getFileExtension(fileType)}`;
      const { client: r2Client, bucketName, publicUrl } = getR2Config();

      await r2Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: body,
          ContentType: fileType,
        })
      );

      const baseUrl = publicUrl.replace(TRAILING_SLASH_REGEX, "");

      return {
        key,
        publicUrl: `${baseUrl}/${key}`,
      };
    }),
  uploadSvg: authorizedProcedure
    .input(uploadSvgSchema)
    .handler(async ({ context, input }) => {
      const orgId = context.session?.activeOrganizationId;

      if (!orgId) {
        throw unauthorized("Active organization required for SVG upload");
      }

      const membership = await db.query.members.findFirst({
        where: and(
          eq(members.userId, context.user.id),
          eq(members.organizationId, orgId)
        ),
        columns: { id: true },
      });

      if (!membership) {
        throw forbidden("You do not have access to this organization");
      }

      let sanitized: string;
      try {
        sanitized = await sanitizeSvg(input.svg);
      } catch (error) {
        if (error instanceof SvgSanitizationError) {
          throw badRequest(error.message);
        }
        throw error;
      }

      const id = nanoid();
      const key =
        input.type === "brand_asset"
          ? `organization/${orgId}/brand-assets/${id}.svg`
          : `organization/${orgId}/content/${id}.svg`;

      const { client: r2Client, bucketName, publicUrl } = getR2Config();

      await r2Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: sanitized,
          ContentType: SVG_MIME_TYPE,
          ContentDisposition:
            input.type === "brand_asset" ? "inline" : "attachment",
          CacheControl: "no-store",
        })
      );

      const baseUrl = publicUrl.replace(TRAILING_SLASH_REGEX, "");

      return {
        key,
        publicUrl: `${baseUrl}/${key}`,
      };
    }),
};
