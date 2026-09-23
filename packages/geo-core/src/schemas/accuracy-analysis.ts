import { GEO_BRAND_FACT_CATEGORIES } from "@notra/db/types/geo-accuracy";
import { z } from "zod";

import { ACCURACY_MAX_CLAIMS } from "../constants/accuracy-analysis";
import { sentimentPeriodInputSchema } from "./sentiment-analysis";

export const accuracyPeriodInputSchema = sentimentPeriodInputSchema;

export const accuracyClaimOutputSchema = z
  .object({
    claims: z
      .array(
        z
          .object({
            statement: z.string().trim().min(1).max(240),
            category: z.enum(GEO_BRAND_FACT_CATEGORIES),
            evidence: z
              .array(
                z
                  .object({
                    checkId: z.string().min(1).max(200),
                    quote: z.string().min(8).max(500),
                  })
                  .strict()
              )
              .min(1)
              .max(6),
          })
          .strict()
      )
      .max(ACCURACY_MAX_CLAIMS),
  })
  .strict();
