// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

export const assetShowcaseSectionSchema = z.object({
  id: z.string(),
  headingPre: z.string(),
  headingAccent: z.string(),
  headingPost: z.string(),
  paragraphs: z.tuple([z.string()]).rest(z.string()),
  videoSrc: z.string(),
  posterSrc: z.string(),
  videoLabel: z.string(),
  mediaSide: z.enum(["left", "right"]),
});

export const assetShowcaseSectionsSchema = z.array(assetShowcaseSectionSchema);
