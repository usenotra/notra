import type { siteConfigSchema } from "@notra/sites-core/schemas/site-config";
import type { z } from "zod";

export type SiteConfig = z.infer<typeof siteConfigSchema>;
