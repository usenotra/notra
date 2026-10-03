import "zod/compile";
import {
  DEFAULT_LANGUAGE,
  type SupportedLanguage,
} from "@notra/ai/constants/languages";
import { supportedLanguageSchema } from "@notra/ai/schemas/language";
import {
  brandAudienceSchema,
  brandCompanyDescriptionSchema,
  brandCompanyNameSchema,
  brandCustomInstructionsSchema,
  brandCustomToneSchema,
  brandNameSchema,
} from "@notra/ai/schemas/limits";
import { toneProfileSchema } from "@notra/ai/schemas/tone";
import { publicWebsiteUrlSchema } from "@notra/geo-core/schemas/url";
import { organizationIdInputSchema } from "@notra/schemas/dashboard/auth/organization";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

export function getValidLanguage(value: unknown): SupportedLanguage {
  const parsed = supportedLanguageSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_LANGUAGE;
}

export const brandSettingsSchema = z.object({
  companyName: brandCompanyNameSchema,
  companyDescription: brandCompanyDescriptionSchema,
  toneProfile: toneProfileSchema,
  customTone: brandCustomToneSchema.nullable().optional(),
  customInstructions: brandCustomInstructionsSchema.nullable().optional(),
  audience: brandAudienceSchema,
  language: supportedLanguageSchema.default(DEFAULT_LANGUAGE),
});

export type BrandSettingsInput = z.infer<typeof brandSettingsSchema>;

export const analyzeBrandSchema = z.object({
  url: z.url("Please enter a valid URL"),
});

export type AnalyzeBrandInput = z.infer<typeof analyzeBrandSchema>;

export const updateBrandSettingsSchema = brandSettingsSchema
  .extend({
    id: z.string().optional(),
    name: brandNameSchema.optional(),
    websiteUrl: z.url().optional(),
  })
  .partial();

export type UpdateBrandSettingsInput = z.infer<
  typeof updateBrandSettingsSchema
>;

export const referenceTypeSchema = z.enum([
  "twitter_post",
  "linkedin_post",
  "blog_post",
  "custom",
]);

export type ReferenceType = z.infer<typeof referenceTypeSchema>;

export const applicableToSchema = z
  .array(z.enum(["all", "twitter", "linkedin", "blog"]))
  .min(1)
  .default(["all"]);

export type ApplicableTo = z.infer<typeof applicableToSchema>;

export const BRAND_REFERENCE_CONTENT_MAX_LENGTH = 10_000;
export const BRAND_REFERENCE_NOTE_MAX_LENGTH = 4000;
export const BRAND_REFERENCE_METADATA_MAX_KEYS = 50;
export const BRAND_REFERENCE_METADATA_KEY_MAX_LENGTH = 128;
export const BRAND_REFERENCE_METADATA_MAX_BYTES = 16_384;

export const referenceSourceUrlSchema = z
  .url({ protocol: /^https?$/ })
  .max(2048);

const brandReferenceMetadataSchema = z
  .record(
    z.string().min(1).max(BRAND_REFERENCE_METADATA_KEY_MAX_LENGTH),
    z.unknown()
  )
  .refine(
    (metadata) =>
      Object.keys(metadata).length <= BRAND_REFERENCE_METADATA_MAX_KEYS,
    {
      message: `Metadata can contain at most ${BRAND_REFERENCE_METADATA_MAX_KEYS} fields`,
    }
  )
  .refine(
    (metadata) =>
      new TextEncoder().encode(JSON.stringify(metadata)).byteLength <=
      BRAND_REFERENCE_METADATA_MAX_BYTES,
    {
      message: `Metadata must be less than ${BRAND_REFERENCE_METADATA_MAX_BYTES} bytes`,
    }
  );

export const createReferenceSchema = z.object({
  type: referenceTypeSchema,
  content: z.string().min(1).max(BRAND_REFERENCE_CONTENT_MAX_LENGTH),
  metadata: brandReferenceMetadataSchema.nullable().optional(),
  note: z.string().max(BRAND_REFERENCE_NOTE_MAX_LENGTH).nullable().optional(),
  sourceUrl: referenceSourceUrlSchema.nullable().optional(),
  applicableTo: applicableToSchema.optional(),
});

export type CreateReferenceInput = z.infer<typeof createReferenceSchema>;

export const updateReferenceSchema = z.object({
  note: z.string().max(BRAND_REFERENCE_NOTE_MAX_LENGTH).nullable().optional(),
  content: z.string().min(1).max(BRAND_REFERENCE_CONTENT_MAX_LENGTH).optional(),
  sourceUrl: referenceSourceUrlSchema.nullable().optional(),
  applicableTo: applicableToSchema.optional(),
});

export type UpdateReferenceInput = z.infer<typeof updateReferenceSchema>;

export const fetchTweetSchema = z.object({
  url: z.string().min(1),
});

export const importTweetsSchema = z.object({
  accountId: z.string().min(1),
  maxResults: z.number().int().min(5).max(20).default(20),
});

export type ImportTweetsInput = z.infer<typeof importTweetsSchema>;

const brandIdentityWithWebsiteSchema = z
  .object({ websiteUrl: z.string().nullish() })
  .partial();

export const brandIdentityToolOutputSchema = z
  .object({
    brandIdentity: brandIdentityWithWebsiteSchema.nullish(),
    brandIdentities: z.array(brandIdentityWithWebsiteSchema).optional(),
  })
  .partial();

export const voiceInputSchema = organizationIdInputSchema.extend({
  voiceId: z.string().min(1, "Voice ID is required"),
});

export const voiceCreateInputSchema = organizationIdInputSchema.extend({
  name: z.string().optional(),
  websiteUrl: z.string().min(1, "Website URL is required"),
});

export const voiceUpdateInputSchema = organizationIdInputSchema
  .extend({
    voiceId: z.string().min(1, "Voice ID is required"),
  })
  .and(updateBrandSettingsSchema.omit({ id: true }));

export const referenceInputSchema = voiceInputSchema.extend({
  referenceId: z.string().min(1, "Reference ID is required"),
});

export const analyzeInputSchema = organizationIdInputSchema.extend({
  voiceId: z.string().optional(),
  url: publicWebsiteUrlSchema,
});

export const setDefaultVoiceInputSchema = organizationIdInputSchema.extend({
  voiceId: z.string().min(1, "Voice ID is required"),
});
