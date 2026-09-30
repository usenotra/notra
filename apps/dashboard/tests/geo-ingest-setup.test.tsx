import { describe, expect, mock, test } from "bun:test";

import { GEO_INGEST_FRAMEWORK_OPTIONS } from "@notra/geo-core/constants/geo";
import type { GeoIngestSetupResponse } from "@notra/geo-core/types/geo";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("@/lib/analytics/posthog-client", () => ({
  trackEvent: mock(),
}));

const { GeoIngestSetup } =
  await import("../src/components/geo/geo-ingest-setup");
const { geoIngestAgentPrompt, geoIngestSnippet } =
  await import("../src/utils/geo-ingest");

const setup: GeoIngestSetupResponse = {
  ingestUrl: "https://app.usenotra.com/api/geo/ingest",
  snippet: "next snippet",
  snippets: {
    next: "next snippet",
    nuxt: "nuxt snippet",
    netlify: "netlify snippet",
    tanstack: "tanstack snippet",
    astro:
      "export const onRequest = createGeoMiddleware({ token: import.meta.env.NOTRA_GEO_TOKEN! });",
    sveltekit:
      "export const handle = createGeoHandle({ token: env.NOTRA_GEO_TOKEN! });",
  },
  token: "",
};

describe("geo ingest setup", () => {
  test("lists Astro and SvelteKit with the other framework tabs", () => {
    const html = renderToStaticMarkup(<GeoIngestSetup setup={setup} />);

    for (const option of GEO_INGEST_FRAMEWORK_OPTIONS) {
      expect(html).toContain(option.label);
    }
  });

  test("returns the Astro and SvelteKit snippets and agent prompts", () => {
    expect(geoIngestSnippet(setup, "astro")).toBe(setup.snippets.astro);
    expect(geoIngestSnippet(setup, "sveltekit")).toBe(setup.snippets.sveltekit);
    expect(geoIngestAgentPrompt(setup, "astro")).toContain("src/middleware.ts");
    expect(geoIngestAgentPrompt(setup, "astro")).toContain(
      setup.snippets.astro
    );
    expect(geoIngestAgentPrompt(setup, "astro")).toContain("server adapter");
    expect(geoIngestAgentPrompt(setup, "sveltekit")).toContain(
      "src/hooks.server.ts"
    );
    expect(geoIngestAgentPrompt(setup, "sveltekit")).toContain(
      setup.snippets.sveltekit
    );
  });
});
