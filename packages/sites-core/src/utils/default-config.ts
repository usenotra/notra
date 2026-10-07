import { siteConfigSchema } from "@notra/sites-core/schemas/site-config";
import {
  siteBlogSchema,
  siteChangelogSchema,
} from "@notra/sites-core/schemas/site-layout";
import type { SiteConfig } from "@notra/sites-core/types/site-config";

export function createDefaultSiteConfig(name: string): SiteConfig {
  return siteConfigSchema.parse({
    name,
    blog: siteBlogSchema.parse({}),
    changelog: siteChangelogSchema.parse({}),
  });
}
