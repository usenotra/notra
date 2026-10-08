import {
  SITE_CONFIG_FILENAME,
  SITE_CONFIG_SCHEMA_URL,
} from "@notra/sites-core/constants/sites";
import { siteConfigSchema } from "@notra/sites-core/schemas/site-config";
import { z } from "zod";

export function buildSiteConfigJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(siteConfigSchema, {
    io: "input",
    target: "draft-2020-12",
    unrepresentable: "any",
  });
  return {
    ...schema,
    $id: SITE_CONFIG_SCHEMA_URL,
    title: SITE_CONFIG_FILENAME,
    description:
      "Configuration of a Notra Sites blog and changelog. Every option except name is optional.",
  };
}

export function serializeSiteConfigJsonSchema(): string {
  return `${JSON.stringify(buildSiteConfigJsonSchema(), null, 2)}\n`;
}
