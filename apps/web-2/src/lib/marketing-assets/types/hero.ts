import type * as z from "zod";

import type { assetHeroSchema, assetHeroVideoSchema } from "../schemas/hero";

export type AssetHero = z.infer<typeof assetHeroSchema>;
export type AssetHeroVideo = z.infer<typeof assetHeroVideoSchema>;
