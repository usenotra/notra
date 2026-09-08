"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";

import { GeoSettingsForm } from "@/components/geo/geo-settings-form";
import { GeoProjectDeleteSection } from "@/components/geo/project-delete-section";
import { GeoProjectQueryProvider } from "@/components/providers/geo-project-provider";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { SettingsPane } from "@/components/settings/settings-pane";
import {
  useGeoModelCatalog,
  useGeoProjects,
  useGeoPrompts,
  useGeoSettings,
} from "@/lib/hooks/use-geo";
import { useGeoProjectQueryState } from "@/lib/hooks/use-geo-project-query";
import type { GeoSettingsFormSection } from "@/types/geo";
import { countEnabledGeoPrompts } from "@/utils/geo-overview-page";

export function GeoSettingsPane({
  section,
}: {
  section: GeoSettingsFormSection;
}) {
  const [projectParam] = useGeoProjectQueryState();

  return (
    <GeoProjectQueryProvider>
      <GeoSettingsPaneContent
        key={projectParam ?? "default"}
        section={section}
      />
    </GeoProjectQueryProvider>
  );
}

function GeoSettingsPaneContent({
  section,
}: {
  section: GeoSettingsFormSection;
}) {
  const [projectParam, setProjectParam] = useGeoProjectQueryState();
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id ?? "";

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
    return (
      <SettingsPane>
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        {section === "brand" ? <Skeleton className="h-48 rounded-lg" /> : null}
      </SettingsPane>
    );
  }

  return (
    <SettingsPane>
      <GeoSettingsForm
        catalog={catalog}
        hideHeader
        key={activeProjectId}
        organizationId={organizationId}
        promptCount={
          promptsData ? countEnabledGeoPrompts(promptsData.prompts) : undefined
        }
        section={section}
        settings={settingsData?.settings ?? null}
      />
      {section === "brand" && activeProject ? (
        <GeoProjectDeleteSection
          onDeleted={setProjectParam}
          organizationId={organizationId}
          project={activeProject}
          replacementProjectId={replacementProjectId}
        />
      ) : null}
    </SettingsPane>
  );
}
