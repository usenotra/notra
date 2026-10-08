import {
  CSP_ORIGIN,
  DATABUDDY_CLIENT_ID,
  GA4_MEASUREMENT_ID,
  HOSTNAME,
  HTTPS_BASE_URL,
  POSTHOG_API_KEY,
} from "@notra/sites-core/constants/integrations";
import { SITE_CSP_MAX_ALLOWED_ORIGINS } from "@notra/sites-core/constants/security";
import { z } from "zod";

const databuddySchema = z.strictObject({
  clientId: z
    .string()
    .trim()
    .regex(DATABUDDY_CLIENT_ID, "Copy the Client ID from Databuddy"),
});

const plausibleSchema = z.strictObject({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(HOSTNAME, "Use the domain as added in Plausible, e.g. acme.com"),
});

const posthogSchema = z.strictObject({
  apiKey: z
    .string()
    .trim()
    .regex(POSTHOG_API_KEY, "Use the project API key (phc_…)"),
  apiHost: z
    .string()
    .trim()
    .overwrite((value) => value.replace(/\/+$/, ""))
    .regex(HTTPS_BASE_URL, "Use an https:// URL without query or hash")
    .optional(),
});

const ga4Schema = z.strictObject({
  measurementId: z
    .string()
    .trim()
    .regex(GA4_MEASUREMENT_ID, "Use the measurement ID (G-…)"),
});

export const siteIntegrationsSchema = z
  .strictObject({
    databuddy: databuddySchema.optional(),
    plausible: plausibleSchema.optional(),
    posthog: posthogSchema.optional(),
    ga4: ga4Schema.optional(),
  })
  .default({});

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
