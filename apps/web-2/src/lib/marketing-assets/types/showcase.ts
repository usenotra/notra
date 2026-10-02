import type * as z from "zod";

import type { assetShowcaseSectionSchema } from "../schemas/showcase";

export type AssetShowcaseSection = z.infer<typeof assetShowcaseSectionSchema>;
