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
    databuddy: { clientId: "3ed1fce1-5a56-4db3-8df5-a1036322c999" },
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
      provider: "ga4",
      settings: { domain: "acme.com" },
    }).success
  ).toBe(false);
});
