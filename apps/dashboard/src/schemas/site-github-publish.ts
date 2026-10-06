import { SITE_AUTHOR_ID } from "@notra/sites-core/constants/site-config";
import { z } from "zod";

export const siteConfigAuthorsSchema = z.object({
  authors: z
    .record(
      z.string().regex(SITE_AUTHOR_ID),
      z.object({ name: z.string().trim().min(1) })
    )
    .optional(),
});
