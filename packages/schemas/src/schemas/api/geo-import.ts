import "zod/compile";
import { z } from "@hono/zod-openapi";

export const geoImportIssueSchema = z.object({
  line: z.number().int(),
  message: z.string(),
});
