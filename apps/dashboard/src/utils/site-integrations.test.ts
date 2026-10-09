import { expect, test } from "bun:test";

import { saveSiteIntegrationInputSchema } from "@notra/schemas/dashboard/sites";

import { SITE_INTEGRATION_PROVIDERS } from "@/constants/site-integrations";

import {
  siteIntegrationFieldErrors,
  siteIntegrationFormValues,
  siteIntegrationSettingsFromValues,
} from "./site-integrations";

test("every dashboard provider submits the same shape accepted by the API", () => {
  const settings = {
    ga4: { measurementId: "G-ABC123XYZ9" },
    umami: {
      websiteId: "94db1cb1-74f4-4a40-ad6c-962362670409",
      scriptUrl: "https://stats.acme.com/script.js",
      hostUrl: "https://events.acme.com",
    },
    plausible: { domain: "acme.com", server: "stats.acme.com" },
    posthog: {
      apiKey: "phc_abcdefghijklmnopqrstuvwxyz0123",
      apiHost: "https://eu.i.posthog.com",
      sessionRecording: false,
    },
  };
  for (const provider of SITE_INTEGRATION_PROVIDERS) {
    const next = siteIntegrationSettingsFromValues(
      provider,
      siteIntegrationFormValues(provider, settings[provider.id])
    );
    expect(next).toEqual(settings[provider.id]);
    expect(siteIntegrationFieldErrors(provider, next)).toEqual({});
    const request: unknown = {
      organizationId: "org_test",
      siteId: "site_test",
      provider: provider.id,
      settings: next,
    };
    const parsed = saveSiteIntegrationInputSchema.parse(request);
    expect(parsed.organizationId).toBe("org_test");
    expect(parsed.siteId).toBe("site_test");
    expect(parsed.provider).toBe(provider.id);
    expect(parsed.settings).toEqual(settings[provider.id]);
    expect(
      saveSiteIntegrationInputSchema.safeParse({
        organizationId: "org_test",
        siteId: "site_test",
        provider: provider.id,
        settings: null,
      }).success
    ).toBe(true);
  }
});

test("PostHog defaults recording on and preserves an explicit false", () => {
  const provider = SITE_INTEGRATION_PROVIDERS.find(
    (entry) => entry.id === "posthog"
  );
  if (!provider) {
    throw new Error("Missing PostHog provider");
  }
  expect(siteIntegrationFormValues(provider, null).sessionRecording).toBe(true);
  const values = siteIntegrationFormValues(provider, {
    apiKey: "phc_abcdefghijklmnopqrstuvwxyz0123",
    sessionRecording: false,
  });
  expect(siteIntegrationSettingsFromValues(provider, values)).toEqual({
    apiKey: "phc_abcdefghijklmnopqrstuvwxyz0123",
    sessionRecording: false,
  });
});

test("empty optional fields are omitted and errors belong to the input field", () => {
  const provider = SITE_INTEGRATION_PROVIDERS.find(
    (entry) => entry.id === "plausible"
  );
  if (!provider) {
    throw new Error("Missing Plausible provider");
  }
  expect(
    siteIntegrationSettingsFromValues(provider, {
      domain: " acme.com ",
      server: " ",
    })
  ).toEqual({ domain: "acme.com" });
  expect(
    siteIntegrationFieldErrors(provider, { domain: "https://acme.com" })
  ).toHaveProperty("domain");
  expect(
    saveSiteIntegrationInputSchema.safeParse({
      organizationId: "org_test",
      siteId: "site_test",
      provider: "umami",
      settings: { domain: "acme.com" },
    }).success
  ).toBe(false);
});

test("Umami Cloud needs only a Website ID and invalid inputs cannot autosave", () => {
  const provider = SITE_INTEGRATION_PROVIDERS.find(
    (entry) => entry.id === "umami"
  );
  if (!provider) {
    throw new Error("Missing Umami provider");
  }
  const settings = siteIntegrationSettingsFromValues(provider, {
    websiteId: " 94db1cb1-74f4-4a40-ad6c-962362670409 ",
    scriptUrl: " ",
    hostUrl: " ",
  });
  expect(settings).toEqual({
    websiteId: "94db1cb1-74f4-4a40-ad6c-962362670409",
  });
  expect(siteIntegrationFieldErrors(provider, settings)).toEqual({});
  expect(
    siteIntegrationFieldErrors(provider, {
      websiteId: "invalid",
      scriptUrl: "http://stats.acme.com/script.js",
      // oxlint-disable-next-line no-script-url -- Unsafe scheme is a rejection fixture.
      hostUrl: "javascript:alert(1)",
    })
  ).toEqual({
    websiteId: expect.any(String),
    scriptUrl: expect.any(String),
    hostUrl: expect.any(String),
  });
  expect(SITE_INTEGRATION_PROVIDERS.map((entry) => entry.id).sort()).toEqual([
    "ga4",
    "plausible",
    "posthog",
    "umami",
  ]);
});

test("GA4 requires a web stream Measurement ID and reports errors on that field", () => {
  const provider = SITE_INTEGRATION_PROVIDERS.find(
    (entry) => entry.id === "ga4"
  );
  if (!provider) {
    throw new Error("Missing GA4 provider");
  }
  expect(
    siteIntegrationSettingsFromValues(provider, {
      measurementId: " G-ABC123XYZ9 ",
    })
  ).toEqual({ measurementId: "G-ABC123XYZ9" });
  expect(
    siteIntegrationFieldErrors(provider, { measurementId: "UA-123456-1" })
  ).toHaveProperty("measurementId");
});
