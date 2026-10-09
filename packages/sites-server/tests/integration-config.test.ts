import { expect, test } from "bun:test";

import { SiteInputError } from "../src/errors";
import { updateSiteIntegrationConfig } from "../src/utils/site-integration-config";

test("saving normalizes provider settings while preserving the rest of blog.json", () => {
  const config = {
    name: "Acme",
    $schema: "https://www.usenotra.com/schemas/blog.json",
    navbar: { links: [{ label: "Home", href: "https://acme.com" }] },
    integrations: { ga4: { measurementId: "G-ABC123XYZ9" } },
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
      ga4: { measurementId: "G-ABC123XYZ9" },
    },
  });
  const first = updateSiteIntegrationConfig(content, {
    provider: "plausible",
    settings: null,
  });
  expect(first.integrations).toEqual({
    ga4: { measurementId: "G-ABC123XYZ9" },
  });
  const last = updateSiteIntegrationConfig(first.content, {
    provider: "ga4",
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
        provider: "ga4",
        settings: { measurementId: "G-ABC123XYZ9" },
      })
    ).toThrow(SiteInputError);
  }
});

test("invalid settings report their configuration path", () => {
  expect(() =>
    updateSiteIntegrationConfig('{"name":"Acme"}', {
      provider: "ga4",
      settings: { measurementId: "invalid" },
    })
  ).toThrow("integrations.ga4.measurementId");
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
