import { GEO_WRITER_NAV_LINK } from "@notra/geo-core/constants/geo";

import {
  ANALYTICS_NAV_LINK,
  DEFAULT_NAV_VISIBILITY,
  GEO_OVERVIEW_NAV_LINK,
  GEO_ROUTE_SECTIONS,
  NAV_GEO_IMPROVE_LINKS,
  NAV_MAIN_ITEMS,
  ORG_ROOT_PROJECT_PARAM,
  SHARED_ROUTE_PREFIXES,
  SIDEBAR_DEFAULT_MODE,
  STUDIO_ROUTE_SECTIONS,
} from "@/constants/nav";
import type {
  NavMainItem,
  NavVisibility,
  OrgRootSearchParams,
  SidebarMode,
} from "@/types/components/nav";

import { geoNavHref } from "./geo-paths";
import { filterIrisNavItems } from "./iris-flag";

const NAV_ITEMS_BY_LINK = new Map(
  NAV_MAIN_ITEMS.map((item) => [item.link, item])
);

export function isSidebarMode(value: unknown): value is SidebarMode {
  return value === "geo" || value === "studio";
}

export function resolveSidebarMode(
  route: string | undefined,
  storedMode: SidebarMode | null
): SidebarMode {
  // Org root is both Studio home and the dashboard entry URL. Keep a stored
  // GEO pick so opening `/{slug}` can restore that mode instead of writing
  // studio over it.
  if (route === undefined) {
    return storedMode ?? "studio";
  }
  // Shared destinations keep the current mode. Without a stored choice, match
  // the org root's visible Studio default instead of switching on navigation.
  if (
    SHARED_ROUTE_PREFIXES.some(
      (prefix) => route === prefix || route.startsWith(`${prefix}/`)
    )
  ) {
    return storedMode ?? "studio";
  }
  const section = route.split("/", 1)[0] ?? route;
  if (GEO_ROUTE_SECTIONS.has(section)) {
    return "geo";
  }
  if (STUDIO_ROUTE_SECTIONS.has(section)) {
    return "studio";
  }
  return storedMode ?? SIDEBAR_DEFAULT_MODE;
}

/** Route after the org slug (`/{slug}/geo/prompts` → "geo/prompts"), or undefined on the org root. */
export function sidebarRouteFromPathname(pathname: string): string | undefined {
  return pathname.split("/").filter(Boolean).slice(1).join("/") || undefined;
}

export function isOrgRootPath(pathname: string, slug: string): boolean {
  return pathname === `/${slug}` || pathname === `/${slug}/`;
}

function appendForwardedParams(
  path: string,
  params: OrgRootSearchParams | undefined
): string {
  if (!params) {
    return path;
  }
  const forwarded = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    // `project` is already resolved into the target path (and may come from a
    // cookie rather than the URL), so it must not be duplicated here.
    if (key === ORG_ROOT_PROJECT_PARAM) {
      continue;
    }
    if (typeof value === "string") {
      forwarded.append(key, value);
      continue;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        forwarded.append(key, entry);
      }
    }
  }
  const query = forwarded.toString();
  if (!query) {
    return path;
  }
  return `${path}${path.includes("?") ? "&" : "?"}${query}`;
}

/** Path to send a bare dashboard open to, or null to stay on Studio home. */
export function resolveOrgRootRedirect(
  slug: string,
  storedMode: SidebarMode | null,
  projectId?: string,
  searchParams?: OrgRootSearchParams
): string | null {
  if (storedMode !== "geo") {
    return null;
  }
  // Deep links such as `/{slug}?settings=general` must survive the stored-mode
  // redirect, otherwise the settings modal never opens for GEO users.
  return appendForwardedParams(
    geoNavHref(slug, GEO_OVERVIEW_NAV_LINK, projectId),
    searchParams
  );
}

export function resolveNavItems(
  links: readonly string[],
  visibility: NavVisibility = DEFAULT_NAV_VISIBILITY
): NavMainItem[] {
  const items: NavMainItem[] = [];
  for (const link of links) {
    const item = NAV_ITEMS_BY_LINK.get(link);
    if (item) {
      items.push(item);
    }
  }
  const withAnalytics = visibility.analytics
    ? items
    : items.filter((item) => item.link !== ANALYTICS_NAV_LINK);
  return filterIrisNavItems(withAnalytics, visibility.iris);
}

export function resolveGeoImproveLinks(
  writeAsPrimaryAction: boolean
): readonly string[] {
  if (!writeAsPrimaryAction) {
    return NAV_GEO_IMPROVE_LINKS;
  }
  return NAV_GEO_IMPROVE_LINKS.filter((link) => link !== GEO_WRITER_NAV_LINK);
}

export function resolveActiveNavLink(
  pathname: string,
  slug: string,
  links: readonly string[]
): string | null {
  const root = `/${slug}`;
  let active: string | null = null;
  for (const link of links) {
    const href = `${root}${link}`;
    if (link === "") {
      if (pathname === root || pathname === `${root}/`) {
        active = active ?? link;
      }
      continue;
    }
    const matches = pathname === href || pathname.startsWith(`${href}/`);
    if (matches && (active === null || link.length > active.length)) {
      active = link;
    }
  }
  return active;
}
