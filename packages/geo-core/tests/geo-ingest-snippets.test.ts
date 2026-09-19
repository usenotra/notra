import { describe, expect, test } from "bun:test";

import { GEO_INGEST_FRAMEWORK_OPTIONS } from "../src/constants/geo";
import { buildGeoSnippet, buildGeoSnippets } from "../src/geo/ingest";

const APP_URL = "https://app.usenotra.com";

describe("geo ingest snippets", () => {
  test("includes an option and snippet for every supported framework", () => {
    const snippets = buildGeoSnippets(APP_URL);
    const values = GEO_INGEST_FRAMEWORK_OPTIONS.map((option) => option.value);

    expect(values).toEqual([
      "next",
      "nuxt",
      "tanstack",
      "astro",
      "sveltekit",
      "netlify",
    ]);
    expect(Object.keys(snippets).toSorted()).toEqual(values.toSorted());
  });

  test("builds the Astro middleware snippet", () => {
    expect(buildGeoSnippet(APP_URL, "astro")).toBe(
      [
        'import { createGeoMiddleware } from "@usenotra/geo/astro";',
        "",
        "export const onRequest = createGeoMiddleware({",
        "  token: import.meta.env.NOTRA_GEO_TOKEN!,",
        `  endpoint: "${APP_URL}",`,
        "});",
      ].join("\n")
    );
  });

  test("builds the SvelteKit handle snippet", () => {
    expect(buildGeoSnippet(APP_URL, "sveltekit")).toBe(
      [
        'import { env } from "$env/dynamic/private";',
        'import { createGeoHandle } from "@usenotra/geo/sveltekit";',
        "",
        "export const handle = createGeoHandle({",
        "  token: env.NOTRA_GEO_TOKEN!,",
        `  endpoint: "${APP_URL}",`,
        "});",
      ].join("\n")
    );
  });
});
