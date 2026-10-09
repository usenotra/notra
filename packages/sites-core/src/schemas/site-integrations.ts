import {
  CSP_ORIGIN,
  GA4_MEASUREMENT_ID,
  HOSTNAME,
  HOSTNAME_WITH_PORT,
  HTTPS_BASE_URL,
  HTTPS_SCRIPT_URL,
  POSTHOG_API_KEY,
} from "@notra/sites-core/constants/integrations";
import { SITE_CSP_MAX_ALLOWED_ORIGINS } from "@notra/sites-core/constants/security";
import { z } from "zod";

const ga4Schema = z.strictObject({
  measurementId: z
    .string({ error: "Use the measurement ID (G-…)" })
    .trim()
    .regex(GA4_MEASUREMENT_ID, "Use the measurement ID (G-…)")
    .describe(
      "Google Analytics 4 web stream Measurement ID (G-…). Find it in Admin > Data streams > your web stream."
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
    .regex(HTTPS_BASE_URL, "Use an https:// URL without query or hash")
    .overwrite((value) => value.replace(/\/+$/, ""))
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

const umamiSchema = z.strictObject({
  websiteId: z
    .string({ error: "Copy the Website ID from Umami's tracking code" })
    .trim()
    .uuid("Copy the Website ID from Umami's tracking code")
    .describe(
      "Public Umami Website ID (UUID) from your website's Tracking code. No API key is needed."
    ),
  scriptUrl: z
    .string()
    .trim()
    .regex(
      HTTPS_SCRIPT_URL,
      "Use the full https:// script URL including its path, without query or hash"
    )
    .optional()
    .describe(
      "Tracker script URL including a non-root path. Defaults to https://cloud.umami.is/script.js; use your self-hosted HTTPS script URL when needed."
    ),
  hostUrl: z
    .string()
    .trim()
    .regex(HTTPS_BASE_URL, "Use an https:// URL without query or hash")
    .overwrite((value) => value.replace(/\/+$/, ""))
    .optional()
    .describe(
      "Optional collection endpoint base URL (data-host-url). Only needed when events should go to a different endpoint, such as a reverse proxy."
    ),
});

export const siteIntegrationSchemas = {
  ga4: ga4Schema,
  plausible: plausibleSchema,
  posthog: posthogSchema,
  umami: umamiSchema,
};

export const siteIntegrationUpdateSchema = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("ga4"), settings: ga4Schema.nullable() }),
  z.object({
    provider: z.literal("umami"),
    settings: umamiSchema.nullable(),
  }),
  z.object({
    provider: z.literal("plausible"),
    settings: plausibleSchema.nullable(),
  }),
  z.object({
    provider: z.literal("posthog"),
    settings: posthogSchema.nullable(),
  }),
]);

export const siteIntegrationsSchema = z
  .strictObject({
    ga4: ga4Schema.optional(),
    plausible: plausibleSchema.optional(),
    posthog: posthogSchema.optional(),
    umami: umamiSchema.optional(),
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
