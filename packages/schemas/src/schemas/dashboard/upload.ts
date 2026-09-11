import "zod/compile";
import z from "zod";

import {
  ALLOWED_CHAT_MIME_TYPES,
  MAX_AVATAR_FILE_SIZE,
  MAX_BRAND_ASSET_FILE_SIZE,
  MAX_CHAT_FILE_SIZE,
  MAX_CONTENT_FILE_SIZE,
  MAX_LOGO_FILE_SIZE,
  MAX_SVG_CONTENT_SIZE,
} from "../../constants/dashboard/upload";

export const uploadAvatarSchema = z.object({
  type: z.literal("avatar"),
  fileType: z.coerce.string().nonempty(),
  fileSize: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_AVATAR_FILE_SIZE, {
      message: `Avatar image must be less than ${MAX_AVATAR_FILE_SIZE / 1024 / 1024}MB`,
    }),
});

export const uploadLogoSchema = z.object({
  type: z.literal("logo"),
  fileType: z.coerce.string().nonempty(),
  fileSize: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_LOGO_FILE_SIZE, {
      message: `Logo image must be less than ${MAX_LOGO_FILE_SIZE / 1024 / 1024}MB`,
    }),
});

export const uploadBrandAssetSchema = z.object({
  type: z.literal("brand_asset"),
  fileType: z.coerce.string().nonempty(),
  fileSize: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_BRAND_ASSET_FILE_SIZE, {
      message: `Brand asset must be less than ${MAX_BRAND_ASSET_FILE_SIZE / 1024 / 1024}MB`,
    }),
});

export const uploadMediaSchema = z.object({
  type: z.literal("content"),
  fileType: z.coerce.string().nonempty(),
  fileSize: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_CONTENT_FILE_SIZE, {
      message: `Content file must be less than ${MAX_CONTENT_FILE_SIZE / 1024 / 1024}MB`,
    }),
});

export const uploadChatSchema = z.object({
  type: z.literal("chat"),
  fileType: z.coerce.string().nonempty(),
  fileSize: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_CHAT_FILE_SIZE, {
      message: `Chat attachment must be less than ${MAX_CHAT_FILE_SIZE / 1024 / 1024}MB`,
    }),
});

export const uploadSchema = z.union([
  uploadAvatarSchema,
  uploadLogoSchema,
  uploadBrandAssetSchema,
  uploadMediaSchema,
  uploadChatSchema,
]);

export const deleteChatUploadSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(512)
    .refine((value) => !value.includes("..") && !value.startsWith("/"), {
      message: "Invalid object key",
    }),
});

export const recordChatAttachmentSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(512)
    .refine((value) => !value.includes("..") && !value.startsWith("/"), {
      message: "Invalid object key",
    }),
  filename: z.string().min(1).max(512),
  mediaType: z.enum(ALLOWED_CHAT_MIME_TYPES),
  size: z.coerce.number().int().positive().max(MAX_CHAT_FILE_SIZE),
});

const svgStringSchema = z.string().min(1);

export const uploadSvgSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("content"),
    svg: svgStringSchema.refine(
      (value) => Buffer.byteLength(value, "utf8") <= MAX_SVG_CONTENT_SIZE,
      {
        message: `SVG content must be less than ${MAX_SVG_CONTENT_SIZE / 1024 / 1024}MB`,
      }
    ),
  }),
  z.object({
    type: z.literal("brand_asset"),
    svg: svgStringSchema.refine(
      (value) => Buffer.byteLength(value, "utf8") <= MAX_BRAND_ASSET_FILE_SIZE,
      {
        message: `Brand asset SVG must be less than ${MAX_BRAND_ASSET_FILE_SIZE / 1024 / 1024}MB`,
      }
    ),
  }),
]);

export type UploadSvgInput = z.infer<typeof uploadSvgSchema>;

export const uploadLogoFromUrlSchema = z.object({
  sourceUrl: z.url().max(2048),
});

export const DeleteSchema = z.object({
  mediaIds: z.array(z.string()).min(1).max(100),
});
