"use client";

import Link from "next/link";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { GeneratePersonasButton } from "@/components/geo/generate-personas-button";
import { PersonaActivityCard } from "@/components/geo/persona-activity-card";
import { PersonaAddDialog } from "@/components/geo/persona-add-dialog";
import { PersonasTable } from "@/components/geo/personas-table";
import { GeoTableSkeleton } from "@/components/geo/skeleton-parts";
import { PageContainer } from "@/components/layout/container";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import {
  GEO_PERSONA_SKELETON_ROW_COUNT,
  GEO_PERSONAS_EMPTY_DESCRIPTION,
  GEO_PERSONAS_EMPTY_TITLE,
  GEO_PERSONAS_PAGE_DESCRIPTION,
  GEO_PERSONAS_PAGE_TITLE,
} from "@/constants/geo-personas";
import { useGeoSettings } from "@/lib/hooks/use-geo";
import { useGeoPersonas } from "@/lib/hooks/use-geo-personas";
import { usePersonaAddFlow } from "@/lib/hooks/use-persona-add-flow";
import type { GeoPageClientProps } from "@/types/geo";
import type { GeoPersonasPageHeaderProps } from "@/types/geo-personas-ui";
import { withGeoProject } from "@/utils/geo-paths";

import { GeoPersonasSkeleton } from "./skeleton";

function PageHeader({ action }: GeoPersonasPageHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          {GEO_PERSONAS_PAGE_TITLE}
        </h1>
        <p className="text-muted-foreground">{GEO_PERSONAS_PAGE_DESCRIPTION}</p>
      </div>
      {action}
    </header>
  );
}

export default function PageClient({ organizationSlug }: GeoPageClientProps) {
  return <GeoPersonasPageContent organizationSlug={organizationSlug} />;
}

function GeoPersonasPageContent({ organizationSlug }: GeoPageClientProps) {
  const { projectId } = useGeoProjectScope();
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const orgFromList = getOrganization(organizationSlug);
  const organization =
    activeOrganization?.slug === organizationSlug
      ? activeOrganization
      : orgFromList;
  const organizationId = organization?.id ?? "";

  const { data: settingsData, isPending: isSettingsPending } =
    useGeoSettings(organizationId);
  const { data: personasData, isPending: isPersonasPending } =
    useGeoPersonas(organizationId);

  const personas = personasData?.personas ?? [];
  const activePersonas = personas.filter((persona) => !persona.archivedAt);
  const hasStoredPersonas = personas.length > 0;
  const {
    addOpen,
    atPersonaLimit,
    autoOpenPersonaId,
    clearAutoOpenPersona,
    hasPersonas,
    isAddingPersona,
    isGenerating,
    onGenerateClick,
    progress,
    setAddOpen,
    submitPersona,
  } = usePersonaAddFlow(organizationId, activePersonas);

  if (isSettingsPending) {
    return <GeoPersonasSkeleton />;
  }

  if (!settingsData?.settings) {
    return (
      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <PageHeader />
          <EmptyState
            action={
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={withGeoProject(`/${organizationSlug}/geo`, projectId)}
                  />
                }
              >
                Set up GEO tracking
              </Button>
            }
            description="Set up GEO tracking first, then generate a persona set."
            preview={
              <EmptyStateTablePreview
                columns={EMPTY_STATE_TABLE_COLUMNS.personas}
                rows={EMPTY_STATE_TABLE_ROWS}
              />
            }
            title="Not set up yet"
          />
        </div>
      </PageContainer>
    );
  }

  const isLoadingPersonas = isPersonasPending && !hasStoredPersonas;
  const showEmptyState = !(isLoadingPersonas || hasStoredPersonas);
  // The empty state carries the primary action until personas exist.
  const headerAction =
    showEmptyState || isLoadingPersonas ? null : (
      <GeneratePersonasButton
        hasPersonas={hasPersonas}
        onClick={onGenerateClick}
        progress={progress}
      />
    );

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeader action={headerAction} />

        {isLoadingPersonas ? (
          <GeoTableSkeleton rows={GEO_PERSONA_SKELETON_ROW_COUNT} />
        ) : null}

        {hasPersonas ? (
          <PersonaActivityCard
            organizationId={organizationId}
            personas={activePersonas}
          />
        ) : null}
        {hasStoredPersonas ? (
          <PersonasTable
            isAddingPersona={isAddingPersona}
            onAutoOpenClose={clearAutoOpenPersona}
            openPersonaId={autoOpenPersonaId}
            organizationId={organizationId}
            personas={personas}
          />
        ) : null}

        {showEmptyState ? (
          <EmptyState
            action={
              <GeneratePersonasButton
                hasPersonas={false}
                onClick={onGenerateClick}
                progress={progress}
              />
            }
            description={GEO_PERSONAS_EMPTY_DESCRIPTION}
            preview={
              <EmptyStateTablePreview
                columns={EMPTY_STATE_TABLE_COLUMNS.personas}
                rows={EMPTY_STATE_TABLE_ROWS}
              />
            }
            title={GEO_PERSONAS_EMPTY_TITLE}
          />
        ) : null}
      </div>
      <PersonaAddDialog
        atLimit={atPersonaLimit}
        open={addOpen}
        onOpenChange={setAddOpen}
        isPending={isGenerating}
        onSubmit={submitPersona}
      />
    </PageContainer>
  );
}
