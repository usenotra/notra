import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

import { z } from "zod";

import { SITE_CONFIG_JSON_SCHEMA_PATH } from "../src/constants/json-schema";
import { SITE_CONFIG_SCHEMA_URL } from "../src/constants/sites";
import { siteConfigSchema } from "../src/schemas/site-config";
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

  test.each([
    ["https://events.acme.com", true],
    ["https://events.acme.com/", true],
    ["https://events.acme.com:8443/ingest/", true],
    ["https://events.acme.com/ingest///", true],
    ["http://events.acme.com/", false],
    ["https://events.acme.com/ingest/?query=1", false],
    ["https://events.acme.com/ingest/#fragment", false],
    ["https://events.acme.com:65536/", false],
  ])("collection URL validation agrees with editors: %s", (value, valid) => {
    const editorSchema = z.fromJSONSchema(buildSiteConfigJsonSchema());
    for (const integrations of [
      {
        umami: {
          websiteId: "94db1cb1-74f4-4a40-ad6c-962362670409",
          hostUrl: value,
        },
      },
      {
        posthog: {
          apiKey: "phc_abcdefghijklmnopqrstuvwxyz0123",
          apiHost: value,
        },
      },
    ]) {
      const config = { name: "Acme", integrations };
      expect(editorSchema.safeParse(config).success).toBe(valid);
      expect(siteConfigSchema.safeParse(config).success).toBe(valid);
    }
  });

  test.each([
    ["https://stats.acme.com", false],
    ["https://stats.acme.com/", false],
    ["https://stats.acme.com/script.js", true],
    ["https://stats.acme.com:8443/sub/tracker", true],
    ["https://stats.acme.com/tracker/..", false],
  ])("editors validate the tracker path in %s", (scriptUrl, valid) => {
    const config = {
      name: "Acme",
      integrations: {
        umami: {
          websiteId: "94db1cb1-74f4-4a40-ad6c-962362670409",
          scriptUrl,
        },
      },
    };
    expect(
      z.fromJSONSchema(buildSiteConfigJsonSchema()).safeParse(config).success
    ).toBe(valid);
    expect(siteConfigSchema.safeParse(config).success).toBe(valid);
  });
});
