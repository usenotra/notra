import { z } from "zod";

import { BRAND_FONT_ID_RE } from "@/constants/brand-font";

export const fontsourceFamilyListSchema = z.array(
  z.object({
    id: z.string().regex(BRAND_FONT_ID_RE),
    family: z.string().min(1).max(100),
  })
);
