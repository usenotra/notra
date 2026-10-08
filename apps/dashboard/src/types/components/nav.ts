import type { IconSvgElement } from "@hugeicons/react";
import type { PostStatus } from "@notra/schemas/dashboard/content";
import type { ReactNode } from "react";

import type { BrandTab } from "@/types/brand-identity";

export type SidebarMode = "geo" | "studio";

export type NavGroupKey = "visibility" | "improve" | "automation" | "utility";

export type NavItemLabelKey =
  | "home"
  | "chat"
  | "content"
  | "sites"
  | "analytics"
  | "feedback"
  | "brandIdentityTitle"
  | "iris"
  | "schedules"
  | "events"
  | "integrations"
  | "overview"
  | "traffic"
  | "prompts"
  | "contentGaps"
  | "shelfSpace"
  | "agentReadiness"
  | "competitors"
  | "personas"
  | "write"
  | "geoSettings"
  | "skills"
  | "apiKeys";

export type NavBadgeKey = "beta";

export interface NavItem {
  link: string;
  icon: IconSvgElement;
  labelKey: NavItemLabelKey;
}

export interface NavMainItem extends NavItem {
  badge?: NavBadgeKey;
}

export interface SidebarModeOption {
  id: SidebarMode;
  label: string;
  descriptionKey: "measureVisibility" | "createContent";
  icon: IconSvgElement;
}

export interface NavPrimaryActionConfig {
  icon: IconSvgElement;
}

export interface NavVisibility {
  iris: boolean;
  analytics: boolean;
  sites: boolean;
}

export interface NavListProps {
  links: readonly string[];
  slug: string;
  activeLink: string | null;
  projectId?: string;
  geoLocked?: boolean;
  visibility?: NavVisibility;
}

export interface NavModeSwitchProps {
  mode: SidebarMode;
  slug: string;
  projectId?: string;
  onModeChange: (mode: SidebarMode) => void;
  /** Warm the destination before the click, e.g. Studio recents. */
  onPrefetchMode?: (mode: SidebarMode) => void;
}

export interface NavGeoProps {
  slug: string;
  /** Route to resolve the active item against; may lead the real pathname. */
  pathname: string;
  projectId?: string;
}

export interface NavStudioProps {
  slug: string;
  organizationId: string;
  /** Route to resolve the active item against; may lead the real pathname. */
  pathname: string;
  /** Skip fetching while hidden; pass true once Studio is shown or warmed. */
  loadRecent?: boolean;
}

export interface NavModePrimaryActionProps {
  mode: SidebarMode;
  slug: string;
  organizationId: string;
  projectId?: string;
}

export interface NavRecentContentProps {
  slug: string;
  organizationId: string;
  enabled?: boolean;
}

export interface NavUtilityProps {
  slug: string;
}

/**
 * A mode the user picked that the route has not caught up with yet. Scoped to
 * the route it was picked from so it stops applying once navigation moves on.
 */
export interface PendingSidebarMode {
  mode: SidebarMode;
  route: string | undefined;
}

export interface UseSidebarModeResult {
  mode: SidebarMode;
  setMode: (mode: SidebarMode) => void;
  /** Set while the route has not caught up with the user's pick, else null. */
  pendingMode: SidebarMode | null;
}

export interface NavBrandIdentityProps {
  slug: string;
}

export type BrandIdentityNavCountKey = "references" | "sitemap";

export interface NavBrandIdentityItemConfig {
  tab: BrandTab;
  icon: IconSvgElement;
  countKey?: BrandIdentityNavCountKey;
}

export interface NavBrandIdentityItem {
  tab: BrandTab;
  icon: IconSvgElement;
  href: string;
  isActive: boolean;
  count: number | null;
}

export interface NavBrandIdentityModel {
  items: NavBrandIdentityItem[];
}

export interface NavBrandIdentityLinkProps {
  item: NavBrandIdentityItem;
}

export interface NavCountBadgeProps {
  count: number | null;
}

export interface NavLockHintProps {
  message: string;
  className?: string;
}

export type SidebarSwapSide = "left" | "right";

export interface SidebarSwapItem {
  id: string;
  side: SidebarSwapSide;
  className?: string;
  children: ReactNode;
}

export interface SidebarSwapProps {
  activeId: string;
  items: readonly SidebarSwapItem[];
  /** Keep every panel mounted. Use when both sides stay cheap to hold. */
  keepMounted?: boolean;
  className?: string;
}

export interface NavRecentContentItemProps {
  href: string;
  isActive: boolean;
  post: {
    id: string;
    organizationId: string;
    status: PostStatus;
    title: string;
  };
}

export interface NavSiteProps {
  slug: string;
}
