import { GEO_GAPS_NAV_LINK } from "@notra/geo-core/constants/geo";

const GEO_DASHBOARD_PATH_PATTERN = /(?:^|\/)geo(?:\/|\?|$)/;

export function geoDashboardPath(
  organizationSlug: string,
  projectId?: string
): string {
  const base = `/${organizationSlug}/geo`;
  return withGeoProject(base, projectId);
}

export function withGeoProject(path: string, projectId?: string): string {
  if (!projectId) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}project=${encodeURIComponent(projectId)}`;
}

export function isGeoDashboardPath(path: string): boolean {
  return GEO_DASHBOARD_PATH_PATTERN.test(path);
}

export function geoGapsEngineHref(
  organizationSlug: string,
  family: string,
  projectId?: string
): string {
  return withGeoProject(
    `/${organizationSlug}${GEO_GAPS_NAV_LINK}?engine=${encodeURIComponent(family)}`,
    projectId
  );
}

export function geoNavHref(
  organizationSlug: string,
  link: string,
  projectId?: string
): string {
  const path = `/${organizationSlug}${link}`;
  return isGeoDashboardPath(path) ? withGeoProject(path, projectId) : path;
}

export function geoOnboardingPath(projectId?: string, replay = false): string {
  const base = "/onboarding/visibility";
  return onboardingPath(base, projectId, replay);
}

export function geoOnboardingCompetitorsPath(
  projectId?: string,
  replay = false
): string {
  const base = "/onboarding/competitors";
  return onboardingPath(base, projectId, replay);
}

function onboardingPath(
  base: string,
  projectId: string | undefined,
  replay: boolean
): string {
  const params = new URLSearchParams();
  if (projectId) {
    params.set("project", projectId);
  }
  if (replay) {
    params.set("replay", "1");
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
