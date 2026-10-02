// biome-ignore lint/performance/noNamespaceImport: Zod recommended way of importing
import * as z from "zod";

export const assetHeroVideoSchema = z.object({
  src: z.string(),
  poster: z.string(),
  label: z.string(),
});

export const assetHeroSchema = z.object({
  title: z.string(),
  accent: z.string(),
  description: z.string(),
  primaryCta: z.string(),
  secondaryCta: z.string(),
  videos: z.tuple([assetHeroVideoSchema]).rest(assetHeroVideoSchema),
});
