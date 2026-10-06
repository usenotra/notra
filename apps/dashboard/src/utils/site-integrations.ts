import { siteIntegrationsSchema } from "@notra/sites-core/schemas/site-integrations";

import type {
  SiteIntegrationProvider,
  SiteIntegrationValues,
} from "@/types/site-integrations";

export function siteIntegrationSettings(
  integrations: Record<string, unknown> | undefined,
  provider: SiteIntegrationProvider
): Record<string, unknown> | null {
  const value = integrations?.[provider.id];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function siteIntegrationFormValues(
  provider: SiteIntegrationProvider,
  settings: Record<string, unknown> | null
): SiteIntegrationValues {
  const values: SiteIntegrationValues = {};
  for (const field of provider.fields) {
    const value = settings?.[field.key];
    values[field.key] = typeof value === "string" ? value : "";
  }
  return values;
}

export function siteIntegrationSettingsFromValues(
  provider: SiteIntegrationProvider,
  values: SiteIntegrationValues
): Record<string, unknown> {
  const settings: Record<string, unknown> = {};
  for (const field of provider.fields) {
    const value = values[field.key]?.trim();
    if (value) {
      settings[field.key] = value;
    }
  }
  return settings;
}

export function siteIntegrationFieldErrors(
  provider: SiteIntegrationProvider,
  settings: Record<string, unknown>
): Record<string, string> {
  const result = siteIntegrationsSchema.safeParse({ [provider.id]: settings });
  const errors: Record<string, string> = {};
  if (result.success) {
    return errors;
  }
  for (const issue of result.error.issues) {
    const key = issue.path[1];
    if (typeof key === "string" && !errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
}
