import { BRAND_IDENTITY_NAV_ITEMS } from "@/constants/brand-identity";
import type { BrandTab } from "@/types/brand-identity";
import type {
  BrandIdentityNavCountKey,
  NavBrandIdentityItem,
} from "@/types/components/nav";

function buildBrandIdentityHref(
  basePath: string,
  voiceId: string | undefined,
  view?: Exclude<BrandTab, "identity">
): string {
  const params = new URLSearchParams();

  if (voiceId) {
    params.set("voice", voiceId);
  }

  if (view) {
    params.set("view", view);
  }

  const query = params.toString();
  if (!query) {
    return basePath;
  }

  return `${basePath}?${query}`;
}

export function resolveBrandIdentityNavView(
  pathname: string,
  brandBasePath: string,
  viewParam: string | null
): BrandTab | null {
  if (pathname !== brandBasePath) {
    return null;
  }

  if (
    viewParam === "references" ||
    viewParam === "sitemap" ||
    viewParam === "guidelines" ||
    viewParam === "knowledge"
  ) {
    return viewParam;
  }

  return "identity";
}

function navViewForHref(
  tab: BrandTab
): Exclude<BrandTab, "identity"> | undefined {
  if (tab === "identity") {
    return undefined;
  }

  return tab;
}

function navItemCount(
  countKey: BrandIdentityNavCountKey | undefined,
  counts: Record<BrandIdentityNavCountKey, number>
): number | null {
  if (!countKey) {
    return null;
  }

  return counts[countKey];
}

export function buildBrandIdentityNavItems(input: {
  basePath: string;
  voiceId: string | undefined;
  activeView: BrandTab | null;
  counts: Record<BrandIdentityNavCountKey, number>;
}): NavBrandIdentityItem[] {
  return BRAND_IDENTITY_NAV_ITEMS.map((item) => ({
    tab: item.tab,
    label: item.label,
    icon: item.icon,
    href: buildBrandIdentityHref(
      input.basePath,
      input.voiceId,
      navViewForHref(item.tab)
    ),
    isActive: input.activeView === item.tab,
    count: navItemCount(item.countKey, input.counts),
  }));
}
