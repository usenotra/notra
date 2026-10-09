import { expect, test } from "bun:test";

import { SiteInputError } from "../src/errors";
import { updateSiteIntegrationConfig } from "../src/utils/site-integration-config";

test("saving normalizes provider settings while preserving the rest of blog.json", () => {
  const config = {
    name: "Acme",
    $schema: "https://www.usenotra.com/schemas/blog.json",
    navbar: { links: [{ label: "Home", href: "https://acme.com" }] },
    integrations: {
      umami: { websiteId: "94db1cb1-74f4-4a40-ad6c-962362670409" },
    },
  };
  const saved = updateSiteIntegrationConfig(JSON.stringify(config), {
    provider: "plausible",
    settings: { domain: " Acme.com ", server: " Stats.Acme.com " },
  });
  expect(JSON.parse(saved.content)).toEqual({
    ...config,
    integrations: {
      ...config.integrations,
      plausible: { domain: "acme.com", server: "stats.acme.com" },
    },
  });
  expect(saved.content.endsWith("\n")).toBe(true);
});

test("removing providers preserves others and removes the empty integrations object", () => {
  const content = JSON.stringify({
    name: "Acme",
    integrations: {
      plausible: { domain: "acme.com" },
      umami: { websiteId: "94db1cb1-74f4-4a40-ad6c-962362670409" },
    },
  });
  const first = updateSiteIntegrationConfig(content, {
    provider: "plausible",
    settings: null,
  });
  expect(first.integrations).toEqual({
    umami: { websiteId: "94db1cb1-74f4-4a40-ad6c-962362670409" },
  });
  const last = updateSiteIntegrationConfig(first.content, {
    provider: "umami",
    settings: null,
  });
  expect(last.integrations).toEqual({});
  expect(JSON.parse(last.content)).toEqual({ name: "Acme" });
});

test("malformed configuration is rejected instead of overwritten", () => {
  for (const content of [
    "",
    "{",
    "null",
    "[]",
    '{"name":"Acme","integrations":[]}',
    '{"name":"Acme","integrations":null}',
  ]) {
    expect(() =>
      updateSiteIntegrationConfig(content, {
        provider: "umami",
        settings: { websiteId: "94db1cb1-74f4-4a40-ad6c-962362670409" },
      })
    ).toThrow(SiteInputError);
  }
});

test("invalid settings report their configuration path", () => {
  expect(() =>
    updateSiteIntegrationConfig('{"name":"Acme"}', {
      provider: "umami",
      settings: { websiteId: "invalid" },
    })
  ).toThrow("integrations.umami.websiteId");
});

test("PostHog false is preserved and trailing slashes are normalized", () => {
  const saved = updateSiteIntegrationConfig('{"name":"Acme"}', {
    provider: "posthog",
    settings: {
      apiKey: "phc_abcdefghijklmnopqrstuvwxyz0123",
      apiHost: "https://acme.com/ingest/",
      sessionRecording: false,
    },
  });
  expect(saved.integrations.posthog).toEqual({
    apiKey: "phc_abcdefghijklmnopqrstuvwxyz0123",
    apiHost: "https://acme.com/ingest",
    sessionRecording: false,
  });
});

test("GA4 can be saved, updated and removed without changing other providers", () => {
  const initial = JSON.stringify({
    name: "Acme",
    integrations: { plausible: { domain: "acme.com" } },
  });
  const saved = updateSiteIntegrationConfig(initial, {
    provider: "ga4",
    settings: { measurementId: " G-ABC123XYZ9 " },
  });
  expect(saved.integrations.ga4).toEqual({ measurementId: "G-ABC123XYZ9" });
  const updated = updateSiteIntegrationConfig(saved.content, {
    provider: "ga4",
    settings: { measurementId: "G-OTHER12345" },
  });
  expect(updated.integrations.ga4).toEqual({ measurementId: "G-OTHER12345" });
  const removed = updateSiteIntegrationConfig(updated.content, {
    provider: "ga4",
    settings: null,
  });
  expect(removed.integrations).toEqual({ plausible: { domain: "acme.com" } });
});
