import {
  CSP_ORIGIN,
  DATABUDDY_CLIENT_ID,
  GA4_MEASUREMENT_ID,
  HOSTNAME,
  HOSTNAME_WITH_PORT,
  HTTPS_BASE_URL,
  POSTHOG_API_KEY,
} from "@notra/sites-core/constants/integrations";
import { SITE_CSP_MAX_ALLOWED_ORIGINS } from "@notra/sites-core/constants/security";
import { z } from "zod";

const databuddySchema = z.strictObject({
  clientId: z
    .string({ error: "Copy the Client ID from Databuddy" })
    .trim()
    .regex(DATABUDDY_CLIENT_ID, "Copy the Client ID from Databuddy")
    .describe(
      "Public Client ID from your Databuddy dashboard. No script installation is needed."
    ),
});

const plausibleSchema = z.strictObject({
  domain: z
    .string({ error: "Use the domain as added in Plausible, e.g. acme.com" })
    .trim()
    .toLowerCase()
    .regex(HOSTNAME, "Use the domain as added in Plausible, e.g. acme.com")
    .describe(
      "Site domain registered in Plausible, without https:// (e.g. docs.acme.com)."
    ),
  server: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      HOSTNAME_WITH_PORT,
      "Use a hostname with an optional port, without https://, e.g. plausible.acme.com:8443"
    )
    .optional()
    .describe(
      "Self-hosted Plausible hostname with an optional port, without https://. Omit to use plausible.io."
    ),
});

const posthogSchema = z.strictObject({
  apiKey: z
    .string({ error: "Use the project API key (phc_…)" })
    .trim()
    .regex(POSTHOG_API_KEY, "Use the project API key (phc_…)")
    .describe(
      "Public PostHog project API key (phc_…), not a personal API key."
    ),
  apiHost: z
    .string()
    .trim()
    .overwrite((value) => value.replace(/\/+$/, ""))
    .regex(HTTPS_BASE_URL, "Use an https:// URL without query or hash")
    .optional()
    .describe(
      "PostHog ingestion URL. Defaults to https://us.i.posthog.com; use https://eu.i.posthog.com for EU Cloud or your self-hosted HTTPS endpoint."
    ),
  sessionRecording: z
    .boolean()
    .optional()
    .describe(
      "Enable session recording (default: true). Authorize your site domain in PostHog project settings. Set false to keep analytics without recordings."
    ),
});

const ga4Schema = z.strictObject({
  measurementId: z
    .string({ error: "Use the measurement ID (G-…)" })
    .trim()
    .regex(GA4_MEASUREMENT_ID, "Use the measurement ID (G-…)")
    .describe(
      "Google Analytics 4 web stream Measurement ID (G-…). Find it in Admin > Data streams > your web stream."
    ),
});

export const siteIntegrationSchemas = {
  databuddy: databuddySchema,
  plausible: plausibleSchema,
  posthog: posthogSchema,
  ga4: ga4Schema,
};

export const siteIntegrationUpdateSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("databuddy"),
    settings: databuddySchema.nullable(),
  }),
  z.object({
    provider: z.literal("plausible"),
    settings: plausibleSchema.nullable(),
  }),
  z.object({
    provider: z.literal("posthog"),
    settings: posthogSchema.nullable(),
  }),
  z.object({ provider: z.literal("ga4"), settings: ga4Schema.nullable() }),
]);

export const siteIntegrationsSchema = z
  .strictObject({
    databuddy: databuddySchema.optional(),
    plausible: plausibleSchema.optional(),
    posthog: posthogSchema.optional(),
    ga4: ga4Schema.optional(),
  })
  .default({})
  .describe(
    "Analytics providers for the live site. Notra installs their scripts automatically. Preview deployments and local development do not send provider events."
  );

export const siteSecuritySchema = z
  .strictObject({
    contentSecurityPolicy: z.boolean().default(true),
    allowedOrigins: z
      .array(
        z
          .string()
          .trim()
          .toLowerCase()
          .regex(
            CSP_ORIGIN,
            "Use an origin like https://cdn.example.com (no path), optionally https://*.example.com"
          )
      )
      .max(SITE_CSP_MAX_ALLOWED_ORIGINS)
      .default([]),
  })
  .default({ contentSecurityPolicy: true, allowedOrigins: [] });
