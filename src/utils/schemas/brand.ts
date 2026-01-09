// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

export const toneProfileSchema = z.enum([
  "Conversational",
  "Professional",
  "Casual",
  "Formal",
]);

export type ToneProfile = z.infer<typeof toneProfileSchema>;

export const brandSettingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyDescription: z.string().min(10, "Please provide a description"),
  toneProfile: toneProfileSchema,
  customTone: z.string().nullable().optional(),
  customInstructions: z.string().nullable().optional(),
  audience: z.string().min(10, "Please describe your target audience"),
});

export type BrandSettingsInput = z.infer<typeof brandSettingsSchema>;

export const analyzeBrandSchema = z.object({
  url: z.url("Please enter a valid URL"),
});

export type AnalyzeBrandInput = z.infer<typeof analyzeBrandSchema>;

export const updateBrandSettingsSchema = brandSettingsSchema.partial();

export type UpdateBrandSettingsInput = z.infer<
  typeof updateBrandSettingsSchema
>;
