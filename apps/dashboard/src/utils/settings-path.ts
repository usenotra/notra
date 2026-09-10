import {
  DEFAULT_GEO_SETTINGS_SECTION,
  SETTINGS_QUERY_KEY,
} from "@/constants/settings";
import type {
  SettingsSectionId,
  SettingsUrlSearchParams,
} from "@/types/settings/modal";

export function resolveSettingsSection(
  section: SettingsSectionId
): SettingsSectionId {
  if (section === "geo") {
    return DEFAULT_GEO_SETTINGS_SECTION;
  }
  return section;
}

export function settingsQuery(
  section: SettingsSectionId,
  extra?: Record<string, string | undefined>
): string {
  const params = new URLSearchParams();
  params.set(SETTINGS_QUERY_KEY, section);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) {
        params.set(key, value);
      }
    }
  }
  return `?${params.toString()}`;
}

export function settingsPath(
  slug: string,
  section: SettingsSectionId,
  extra?: Record<string, string | undefined>
): string {
  return `/${slug}${settingsQuery(section, extra)}`;
}

export function geoSettingsPath(
  slug: string,
  extra?: Record<string, string | undefined>
): string {
  return `/${slug}/geo${settingsQuery(DEFAULT_GEO_SETTINGS_SECTION, extra)}`;
}

export function firstSearchParamValue(
  value: string | string[] | undefined
): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === "string" && first.length > 0) {
      return first;
    }
  }
  return undefined;
}

export function settingsQueryFromSearchParams(
  query: SettingsUrlSearchParams,
  keys: readonly string[]
): Record<string, string | undefined> {
  const extra: Record<string, string | undefined> = {};
  for (const key of keys) {
    extra[key] = firstSearchParamValue(query[key]);
  }
  return extra;
}
