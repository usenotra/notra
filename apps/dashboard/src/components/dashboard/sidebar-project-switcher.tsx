"use client";

import {
  PlusSignIcon,
  Settings01Icon,
  Tick02Icon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@notra/ui/components/ui/sidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { GeoProjectCreateDialog } from "@/components/geo/project-create-dialog";
import { ProjectLogo } from "@/components/geo/project-logo";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  GEO_SETTINGS_NAV_LINK,
  NAV_NEW_PROJECT_LABEL,
  NAV_PROJECTS_MENU_LABEL,
} from "@/constants/nav";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { useBrandSettings } from "@/lib/hooks/use-brand-analysis";
import { useGeoProjects } from "@/lib/hooks/use-geo";
import { useGeoProjectQueryState } from "@/lib/hooks/use-geo-project-query";
import { getWebsiteDomain } from "@/utils/brand";
import {
  getLastVisitedProjectFromClient,
  setLastVisitedProject,
} from "@/utils/cookies";
import { geoNavHref } from "@/utils/geo-paths";
import { resolveNavItems } from "@/utils/nav";

import { SidebarBrandHeader } from "./sidebar-brand-header";
import { SidebarLabel } from "./sidebar-label";

const GEO_SETTINGS_ITEM = resolveNavItems([GEO_SETTINGS_NAV_LINK]).at(0);

export function SidebarProjectSwitcher() {
  const router = useRouter();
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id ?? "";
  const slug = activeOrganization?.slug ?? "";
  const [projectParam, setProjectParam] = useGeoProjectQueryState();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isPending } = useGeoProjects(organizationId);
  const { data: brandData } = useBrandSettings(organizationId);
  const loadedProjects = data?.projects;
  const projects = loadedProjects ?? [];
  const voices = brandData?.voices ?? [];

  const activeProject =
    projects.find((project) => project.id === projectParam) ??
    projects.at(0) ??
    null;

  useEffect(() => {
    if (loadedProjects === undefined || !slug) {
      return;
    }

    const selectedProject = loadedProjects.find(
      (project) => project.id === projectParam
    );
    if (selectedProject) {
      setLastVisitedProject(slug, selectedProject.id).catch(() => {
        // The current URL remains the source of truth if cookies fail.
      });
      return;
    }

    const lastVisitedProjectId = getLastVisitedProjectFromClient(slug);
    const restoredProject =
      loadedProjects.find((project) => project.id === lastVisitedProjectId) ??
      loadedProjects.at(0) ??
      null;
    const restoredProjectId = restoredProject?.id ?? null;

    if (projectParam !== restoredProjectId) {
      setProjectParam(restoredProjectId);
    }
  }, [loadedProjects, projectParam, setProjectParam, slug]);

  const projectDomain = (brandSettingsId: string) =>
    getWebsiteDomain(
      voices.find((voice) => voice.id === brandSettingsId)?.websiteUrl ?? null
    );

  if (organizationId && isPending) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuSkeleton showIcon />
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!activeProject) {
    return <SidebarBrandHeader />;
  }

  const activeDomain = projectDomain(activeProject.brandSettingsId);
  const settingsHref = geoNavHref(
    slug,
    GEO_SETTINGS_NAV_LINK,
    activeProject.id
  );

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  className="cursor-pointer"
                  size="lg"
                  tooltip={activeProject.name}
                >
                  <ProjectLogo
                    className="size-7 rounded-lg"
                    domain={activeDomain}
                    fallbackClassName="bg-sidebar-accent rounded-lg"
                    name={activeProject.name}
                  />
                  <div className="grid min-w-0 flex-1 leading-tight">
                    <SidebarLabel className="truncate text-sm font-medium">
                      {activeProject.name}
                    </SidebarLabel>
                    {activeDomain ? (
                      <SidebarLabel className="text-muted-foreground truncate text-xs">
                        {activeDomain}
                      </SidebarLabel>
                    ) : null}
                  </div>
                  <HugeiconsIcon
                    className="text-muted-foreground ml-auto"
                    icon={UnfoldMoreIcon}
                  />
                </SidebarMenuButton>
              }
            />
            <DropdownMenuContent
              align="start"
              className="min-w-56 rounded-lg"
              sideOffset={4}
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel>{NAV_PROJECTS_MENU_LABEL}</DropdownMenuLabel>
                {projects.map((project) => (
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 pr-8"
                    key={project.id}
                    onClick={() => {
                      if (project.id !== activeProject.id) {
                        trackEvent(POSTHOG_EVENTS.GEO_PROJECT_SWITCHED, {
                          project_id: project.id,
                          project_count: projects.length,
                        });
                      }
                      setProjectParam(project.id);
                    }}
                  >
                    <ProjectLogo
                      domain={projectDomain(project.brandSettingsId)}
                      name={project.name}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {project.name}
                    </span>
                    {activeProject.id === project.id ? (
                      <HugeiconsIcon
                        className="text-muted-foreground absolute right-2 size-4"
                        icon={Tick02Icon}
                      />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() => setCreateOpen(true)}
              >
                <HugeiconsIcon icon={PlusSignIcon} />
                {NAV_NEW_PROJECT_LABEL}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() => router.push(settingsHref)}
              >
                <HugeiconsIcon
                  icon={GEO_SETTINGS_ITEM?.icon ?? Settings01Icon}
                />
                {GEO_SETTINGS_ITEM?.label ?? "GEO settings"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <GeoProjectCreateDialog
        onCreated={(projectId) => setProjectParam(projectId)}
        onOpenChange={setCreateOpen}
        open={createOpen}
        organizationId={organizationId}
      />
    </>
  );
}
