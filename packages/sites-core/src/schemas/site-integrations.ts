import { SITE_CSP_MAX_ALLOWED_ORIGINS } from "@notra/sites-core/constants/security";
import { z } from "zod";

import {
  HOSTNAME,
  HTTPS_BASE_URL,
  CSP_ORIGIN,
} from "../constants/integrations";

const databuddySchema = z.strictObject({
  clientId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{8,64}$/, "Copy the Client ID from Databuddy"),
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
    .regex(/^phc_[A-Za-z0-9]{20,64}$/, "Use the project API key (phc_…)"),
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
    .regex(/^G-[A-Z0-9]{4,16}$/, "Use the measurement ID (G-…)"),
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
