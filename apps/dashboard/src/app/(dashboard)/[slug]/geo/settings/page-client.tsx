"use client";

import { GeoSettingsForm } from "@/components/geo/geo-settings-form";
import { GeoProjectDeleteSection } from "@/components/geo/project-delete-section";
import { PageContainer } from "@/components/layout/container";
import { GeoProjectProvider } from "@/components/providers/geo-project-provider";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  useGeoModelCatalog,
  useGeoProjects,
  useGeoPrompts,
  useGeoSettings,
} from "@/lib/hooks/use-geo";
import { useGeoProjectQueryState } from "@/lib/hooks/use-geo-project-query";
import type { GeoPageClientProps } from "@/types/geo";
import { countEnabledGeoPrompts } from "@/utils/geo-overview-page";

import { GeoSettingsSkeleton } from "./skeleton";

export default function PageClient({ organizationSlug }: GeoPageClientProps) {
  const [projectParam] = useGeoProjectQueryState();

  return (
    <GeoProjectProvider projectId={projectParam ?? undefined}>
      <SettingsPageContent organizationSlug={organizationSlug} />
    </GeoProjectProvider>
  );
}

function SettingsPageContent({ organizationSlug }: GeoPageClientProps) {
  const [projectParam, setProjectParam] = useGeoProjectQueryState();
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const orgFromList = getOrganization(organizationSlug);
  const organization =
    activeOrganization?.slug === organizationSlug
      ? activeOrganization
      : orgFromList;
  const organizationId = organization?.id ?? "";

  const { data: settingsData, isPending } = useGeoSettings(organizationId);
  const { data: catalog } = useGeoModelCatalog(organizationId);
  const { data: projectsData } = useGeoProjects(organizationId);
  const { data: promptsData } = useGeoPrompts(organizationId);
  const projects = projectsData?.projects ?? [];
  const activeProjectId =
    settingsData?.settings?.projectId ?? projectParam ?? projects.at(0)?.id;
  const activeProject = projects.find(
    (project) => project.id === activeProjectId
  );
  const replacementProjectId = projects.find(
    (project) => project.id !== activeProjectId
  )?.id;

  if (isPending || !catalog) {
    return <GeoSettingsSkeleton />;
  }

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <GeoSettingsForm
          catalog={catalog}
          key={activeProjectId}
          organizationId={organizationId}
          promptCount={
            promptsData
              ? countEnabledGeoPrompts(promptsData.prompts)
              : undefined
          }
          settings={settingsData?.settings ?? null}
        />
        {activeProject ? (
          <GeoProjectDeleteSection
            onDeleted={setProjectParam}
            organizationId={organizationId}
            project={activeProject}
            replacementProjectId={replacementProjectId}
          />
        ) : null}
      </div>
    </PageContainer>
  );
}
