import { describe, expect, test } from "bun:test";

import { GEO_INGEST_FRAMEWORK_OPTIONS } from "../src/constants/geo";
import {
  buildGeoIngestUrl,
  buildGeoIngestSetupInfo,
  buildGeoSnippet,
  buildGeoSnippets,
} from "../src/geo/ingest";
import { resolveGeoIngestOrigin } from "../src/utils/geo-ingest-url";

const APP_URL = "https://app.usenotra.com";

describe("geo ingest snippets", () => {
  test("uses the standalone origin only when explicitly configured", () => {
    const previous = process.env.GEO_INGEST_URL;
    const previousApp = process.env.NEXT_PUBLIC_APP_URL;
    try {
      process.env.NEXT_PUBLIC_APP_URL = APP_URL;
      delete process.env.GEO_INGEST_URL;
      expect(buildGeoIngestUrl()).toBe(`${APP_URL}/api/geo/ingest`);
      process.env.GEO_INGEST_URL = "https://ingest.example.com/";
      expect(buildGeoIngestUrl()).toBe(
        "https://ingest.example.com/api/geo/ingest"
      );
      const setup = buildGeoIngestSetupInfo();
      for (const snippet of Object.values(setup.snippets)) {
        expect(snippet).toContain('endpoint: "https://ingest.example.com"');
        expect(snippet).not.toContain("/api/geo/ingest");
      }
    } finally {
      if (previous === undefined) {
        delete process.env.GEO_INGEST_URL;
      } else {
        process.env.GEO_INGEST_URL = previous;
      }
      if (previousApp === undefined) {
        delete process.env.NEXT_PUBLIC_APP_URL;
      } else {
        process.env.NEXT_PUBLIC_APP_URL = previousApp;
      }
    }
  });
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

describe("resolveGeoIngestOrigin", () => {
  test("accepts an absolute ingest origin", () => {
    expect(
      resolveGeoIngestOrigin(
        " https://ingest.usenotra.com/path ",
        "https://app.usenotra.com"
      )
    ).toBe("https://ingest.usenotra.com");
  });

  test("ignores values without a scheme or pointing at the app", () => {
    expect(
      resolveGeoIngestOrigin("ingest.usenotra.com", "https://app.usenotra.com")
    ).toBeNull();
    expect(
      resolveGeoIngestOrigin(
        "https://app.usenotra.com/",
        "https://app.usenotra.com"
      )
    ).toBeNull();
    expect(resolveGeoIngestOrigin(undefined, undefined)).toBeNull();
  });
});
