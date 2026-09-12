import "zod/compile";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

import { BRAND_GUIDELINE_HEX_COLOR_REGEX } from "../../constants/dashboard/brand-guidelines";

export const guidelineColorRoleSchema = z.enum([
  "primary",
  "secondary",
  "accent",
  "background",
  "foreground",
  "neutral",
  "custom",
]);

export const guidelineFontRoleSchema = z.enum([
  "heading",
  "body",
  "button",
  "unknown",
]);

export const guidelineTokenTypeSchema = z.enum([
  "spacing",
  "radius",
  "shadow",
  "component",
  "unknown",
]);

export const guidelineAssetKindSchema = z.enum(["logo", "wordmark"]);

export const guidelineAssetVariantSchema = z.enum(["light", "dark"]);

export const guidelineScreenshotKindSchema = z.enum([
  "desktop_hero",
  "desktop_full_page",
  "mobile_hero",
]);

const nullableText = (max: number) => z.string().trim().max(max).nullable();
const optionalNullableText = (max: number) => nullableText(max).optional();

export const updateGuidelineColorSchema = z.object({
  colorId: z.string().min(1, "Color ID is required"),
  role: guidelineColorRoleSchema,
  name: nullableText(120),
  lightValue: z.string().trim().min(1, "A light color is required").max(64),
  darkValue: z.string().trim().max(64).nullable(),
  usage: nullableText(240),
});

export const updateGuidelineFontSchema = z.object({
  fontId: z.string().min(1, "Font ID is required"),
  role: guidelineFontRoleSchema,
  family: z.string().trim().min(1, "A font family is required").max(120),
  weight: nullableText(40),
  size: nullableText(40),
  lineHeight: nullableText(40),
});

export const updateGuidelineTokenSchema = z.object({
  tokenId: z.string().min(1, "Token ID is required"),
  type: guidelineTokenTypeSchema,
  name: z.string().trim().min(1, "A token name is required").max(120),
  value: z.string().trim().min(1, "A token value is required").max(240),
});

export const updateGuidelineAssetSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required"),
  kind: guidelineAssetKindSchema,
  variant: guidelineAssetVariantSchema,
  url: z.string().url().optional(),
  storageKey: z.string().min(1).max(512).nullable().optional(),
  format: z.string().min(1).max(20).nullable().optional(),
  mimeType: z.string().min(1).max(120).nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  aspectRatio: z.number().positive().nullable().optional(),
});

export const updateGuidelineScreenshotSchema = z.object({
  screenshotId: z.string().min(1, "Screenshot ID is required"),
  kind: guidelineScreenshotKindSchema,
  fullPage: z.boolean(),
});

export const createGuidelineColorSchema = z.object({
  role: guidelineColorRoleSchema,
  name: optionalNullableText(120),
  lightValue: z.string().trim().min(1, "A light color is required").max(64),
  darkValue: z.string().trim().max(64).nullable().optional(),
  usage: optionalNullableText(240),
});

export const createGuidelineAssetSchema = z.object({
  kind: guidelineAssetKindSchema,
  variant: guidelineAssetVariantSchema,
  url: z.string().url(),
  storageKey: z.string().min(1).max(512).nullable().optional(),
  format: z.string().min(1).max(20).nullable().optional(),
  mimeType: z.string().min(1).max(120).nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  aspectRatio: z.number().positive().nullable().optional(),
});

export type CreateGuidelineColorInput = z.infer<
  typeof createGuidelineColorSchema
>;
export type CreateGuidelineAssetInput = z.infer<
  typeof createGuidelineAssetSchema
>;

export type UpdateGuidelineColorInput = z.infer<
  typeof updateGuidelineColorSchema
>;
export type UpdateGuidelineFontInput = z.infer<
  typeof updateGuidelineFontSchema
>;
export type UpdateGuidelineTokenInput = z.infer<
  typeof updateGuidelineTokenSchema
>;
export type UpdateGuidelineAssetInput = z.infer<
  typeof updateGuidelineAssetSchema
>;
export type UpdateGuidelineScreenshotInput = z.infer<
  typeof updateGuidelineScreenshotSchema
>;

export const brandGuidelinesWorkflowPayloadSchema = z.object({
  brandSettingsId: z.string().min(1),
  organizationId: z.string().min(1),
  sourceUrl: z.string().min(1),
});

const styleguideTextSchema = z.string().trim().min(1);
const optionalStyleguideTextSchema = styleguideTextSchema
  .optional()
  .catch(undefined);

const styleguideHexSchema = styleguideTextSchema.regex(
  BRAND_GUIDELINE_HEX_COLOR_REGEX
);
const optionalStyleguideHexSchema = styleguideHexSchema
  .optional()
  .catch(undefined);

const styleguideTextOrNumberSchema = z.union([
  styleguideTextSchema,
  z.number().transform((value) => String(value)),
]);
const optionalStyleguideTextOrNumberSchema = styleguideTextOrNumberSchema
  .optional()
  .catch(undefined);

export const styleguideRecordSchema = z.record(z.string(), z.unknown());

export const styleguideColorSchema = z.union([
  styleguideHexSchema.transform((hex) => ({
    hex,
    name: null,
    usage: null,
    darkValue: null,
  })),
  z
    .object({
      hex: styleguideHexSchema,
      name: optionalStyleguideTextSchema,
      usage: optionalStyleguideTextSchema,
      darkHex: optionalStyleguideHexSchema,
      darkValue: optionalStyleguideHexSchema,
      dark: optionalStyleguideHexSchema,
    })
    .transform((color) => ({
      hex: color.hex,
      name: color.name ?? null,
      usage: color.usage ?? null,
      darkValue: color.darkHex ?? color.darkValue ?? color.dark ?? null,
    })),
]);

export const styleguideFontSchema = z.union([
  styleguideTextSchema.transform((family) => ({
    family,
    weight: null,
    size: null,
    lineHeight: null,
  })),
  z
    .object({
      fontFamily: styleguideTextSchema,
      fontWeight: optionalStyleguideTextOrNumberSchema,
      weight: optionalStyleguideTextOrNumberSchema,
      fontSize: optionalStyleguideTextSchema,
      size: optionalStyleguideTextSchema,
      lineHeight: optionalStyleguideTextOrNumberSchema,
    })
    .transform((font) => ({
      family: font.fontFamily,
      weight: font.fontWeight ?? font.weight ?? null,
      size: font.fontSize ?? font.size ?? null,
      lineHeight: font.lineHeight ?? null,
    })),
]);

export const styleguideTokenValueSchema = z.union([
  styleguideTextSchema.transform((value) => ({ value, metadata: null })),
  z.number().transform((value) => ({ value: String(value), metadata: null })),
  z
    .looseObject({
      value: optionalStyleguideTextOrNumberSchema,
      boxShadow: optionalStyleguideTextSchema,
      borderRadius: optionalStyleguideTextSchema,
    })
    .transform((token, ctx) => {
      const value = token.value ?? token.boxShadow ?? token.borderRadius;

      if (!value) {
        ctx.addIssue({ code: "custom", message: "Token value is missing" });
        return z.NEVER;
      }

      return { value, metadata: token };
    }),
]);
