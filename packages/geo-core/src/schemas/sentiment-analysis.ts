import { z } from "zod";

import { sentimentPeriods } from "../utils/sentiment-period";
import { geoTimeseriesInputSchema } from "./geo";

export const sentimentPeriodInputSchema = geoTimeseriesInputSchema
  .extend({ from: z.iso.date().optional(), to: z.iso.date().optional() })
  .refine((input) => {
    try {
      sentimentPeriods(input);
      return true;
    } catch {
      return false;
    }
  }, "Choose an inclusive UTC window of 1–366 days.");

export const sentimentThemeOutputSchema = z
  .object({
    themes: z
      .array(
        z
          .object({
            title: z.string().trim().min(1).max(100),
            polarity: z.enum(["positive", "negative"]),
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
      .max(6),
  })
  .strict();
