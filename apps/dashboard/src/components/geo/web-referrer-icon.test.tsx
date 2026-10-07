import { expect, test } from "bun:test";

import type { WebAnalyticsSource } from "@notra/geo-core/types/geo";
import { renderToStaticMarkup } from "react-dom/server";

import { WebReferrerIcon } from "./web-referrer-icon";

function source(group: string, name: string): WebAnalyticsSource {
  return {
    group,
    source: name,
    aiProduct: "",
    sessions: 1,
    previousSessions: 0,
    visitors: 1,
  };
}

test("known search and social referrers use the existing brand logos", () => {
  for (const [group, name, title] of [
    ["search", "google", "Google"],
    ["search", "duckduckgo", "DuckDuckGo"],
    ["social", "github", "GitHub"],
    ["social", "reddit", "Reddit"],
  ] as const) {
    const html = renderToStaticMarkup(
      <WebReferrerIcon source={source(group, name)} />
    );
    expect(html).toContain(`<title>${title}</title>`);
    expect(html).toContain('aria-hidden="true"');
  }
});

test("direct, unknown, and inherited-object source names get a safe UI icon", () => {
  for (const [group, name] of [
    ["direct", ""],
    ["direct", "google"],
    ["search", "unlisted-search"],
    ["other", "constructor"],
    ["other", "__proto__"],
  ] as const) {
    const html = renderToStaticMarkup(
      <WebReferrerIcon source={source(group, name)} />
    );
    expect(html).toContain("<svg");
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("<title>Google</title>");
  }
});

test("AI referrers keep their provider logos", () => {
  const html = renderToStaticMarkup(
    <WebReferrerIcon source={source("ai", "openai")} />
  );
  expect(html).toContain("<svg");
  expect(html).toContain('aria-hidden="true"');
});
