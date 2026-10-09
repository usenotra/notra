import { siteVariablesSchema } from "@notra/sites-core/schemas/site-layout";
import { z } from "zod";

export const siteVariablesConfigSchema = z.looseObject({
  variables: siteVariablesSchema,
});
