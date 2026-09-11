import "zod/compile";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

export const workosErrorSchema = z.looseObject({
  code: z.string().optional(),
  message: z.string().optional(),
  rawData: z
    .looseObject({
      code: z.string().optional(),
      message: z.string().optional(),
      email: z.string().optional(),
      pending_authentication_token: z.string().optional(),
      organizations: z.array(z.looseObject({ id: z.string() })).optional(),
    })
    .optional(),
});
