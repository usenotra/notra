import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

import { SITE_CONFIG_JSON_SCHEMA_PATH } from "../src/constants/json-schema";
import { SITE_CONFIG_SCHEMA_URL } from "../src/constants/sites";
import { buildSiteConfigJsonSchema } from "../src/utils/site-config-json-schema";

describe("blog.json JSON Schema", () => {
  test("the served file matches siteConfigSchema (run `bun run generate:json-schema`)", async () => {
    const committed = JSON.parse(
      await readFile(SITE_CONFIG_JSON_SCHEMA_PATH, "utf8")
    ) as unknown;
    expect(committed).toEqual(buildSiteConfigJsonSchema());
  });

  test("describes the input side: only name is required", () => {
    const schema = buildSiteConfigJsonSchema() as {
      $id: string;
      required: string[];
      properties: Record<string, unknown>;
    };
    expect(schema.$id).toBe(SITE_CONFIG_SCHEMA_URL);
    expect(schema.required).toEqual(["name"]);
    expect(Object.keys(schema.properties)).toEqual(
      expect.arrayContaining(["$schema", "variables", "thumbnails", "markdown"])
    );
  });
});
