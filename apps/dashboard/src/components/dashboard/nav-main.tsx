"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { SIDEBAR_MODE_HOME_LINKS } from "@/constants/nav";
import { useDeferredMount } from "@/lib/hooks/use-deferred-mount";
import { useGeoProjectQueryState } from "@/lib/hooks/use-geo-project-query";
import { useSidebarMode } from "@/lib/hooks/use-sidebar-mode";
import type { SidebarMode } from "@/types/components/nav";
import { geoNavHref } from "@/utils/geo-paths";
import {
  canPrefetchSidebarModeHome,
  sidebarRouteFromPathname,
} from "@/utils/nav";

import { NavGeo } from "./nav-geo";
import { NavModePrimaryAction } from "./nav-mode-primary-action";
import { NavModeSwitch } from "./nav-mode-switch";
import { NavStudio } from "./nav-studio";
import { SidebarSwap } from "./sidebar-swap";

export function NavMain() {
  const { activeOrganization } = useOrganizationsContext();
  const pathname = usePathname();
  const router = useRouter();
  const [projectParam] = useGeoProjectQueryState();
  const route = sidebarRouteFromPathname(pathname);
  const { mode, setMode, pendingMode } = useSidebarMode(route);
  const idleReady = useDeferredMount();
  const [recentWarmed, setRecentWarmed] = useState(mode === "studio");
  const slug = activeOrganization?.slug;
  const projectId = projectParam ?? undefined;
  const loadRecent = mode === "studio" || recentWarmed || idleReady;

  const prefetchModeHome = (next: SidebarMode) => {
    if (!slug || next === mode) {
      return;
    }
    if (next === "studio") {
      setRecentWarmed(true);
    }
    if (!canPrefetchSidebarModeHome(next)) {
      return;
    }
    router.prefetch(geoNavHref(slug, SIDEBAR_MODE_HOME_LINKS[next], projectId));
  };

  useEffect(() => {
    if (!slug) {
      return;
    }
    const other: SidebarMode = mode === "studio" ? "geo" : "studio";
    if (!canPrefetchSidebarModeHome(other)) {
      return;
    }
    router.prefetch(
      geoNavHref(slug, SIDEBAR_MODE_HOME_LINKS[other], projectId)
    );
  }, [mode, slug, projectId, router]);

  if (!slug || !activeOrganization) {
    return null;
  }

  // While a pick is in flight the panels have already swapped but `pathname`
  // still points at the old route, so every item would resolve as inactive and
  // the highlight would pop in once navigation lands. Resolve against where the
  // pick is heading instead, so the highlight arrives with the panel.
  const navPathname = pendingMode
    ? `/${slug}${SIDEBAR_MODE_HOME_LINKS[pendingMode]}`
    : pathname;

  const handleModeChange = (next: SidebarMode) => {
    // Cookie first: org-root navigation reads it. Prefetching Studio before
    // persist would cache the GEO restore redirect as `/{slug}`.
    setMode(next);
    prefetchModeHome(next);
    router.push(geoNavHref(slug, SIDEBAR_MODE_HOME_LINKS[next], projectId));
  };

  return (
    <>
      <NavModeSwitch
        mode={mode}
        onModeChange={handleModeChange}
        onPrefetchMode={prefetchModeHome}
        projectId={projectId}
        slug={slug}
      />
      <NavModePrimaryAction
        mode={mode}
        organizationId={activeOrganization.id}
        projectId={projectId}
        slug={slug}
      />
      {/*
        Both mode panels stay mounted so the swoosh has something to fade
        between. Recents stay unfetched on first GEO paint, then warm on idle
        or when Studio is hovered so the first switch is not a cold list fetch.
      */}
      <SidebarSwap
        activeId={mode}
        className="overflow-hidden"
        items={[
          {
            id: "geo",
            side: "left",
            children: (
              <NavGeo
                pathname={navPathname}
                projectId={projectId}
                slug={slug}
              />
            ),
          },
          {
            id: "studio",
            side: "right",
            children: (
              <NavStudio
                loadRecent={loadRecent}
                organizationId={activeOrganization.id}
                pathname={navPathname}
                slug={slug}
              />
            ),
          },
        ]}
        keepMounted
      />
    </>
  );
}
