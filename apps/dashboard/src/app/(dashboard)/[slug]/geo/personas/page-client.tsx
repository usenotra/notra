"use client";

import { Loading03Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shimmer } from "@notra/ui/components/ai-elements/shimmer";
import Counter from "@notra/ui/components/shared/counter";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@notra/ui/components/ui/empty";
import { useReducedMotion } from "motion/react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import Link from "@/components/framework/link";
import { PersonaActivityCard } from "@/components/geo/persona-activity-card";
import { PersonaAddDialog } from "@/components/geo/persona-add-dialog";
import { PersonasTable } from "@/components/geo/personas-table";
import { GeoTableSkeleton } from "@/components/geo/skeleton-parts";
import { PageContainer } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import { GEO_PERSONA_SKELETON_ROW_COUNT } from "@/constants/geo-personas";
import { useGeoSettings } from "@/lib/hooks/use-geo";
import { useGeoPersonas } from "@/lib/hooks/use-geo-personas";
import { usePersonaAddFlow } from "@/lib/hooks/use-persona-add-flow";
import type { GeoPageClientProps } from "@/types/geo";
import type {
  GeneratePersonasButtonProps,
  PersonaGenerationCounterProps,
} from "@/types/geo-personas-ui";
import { withGeoProject } from "@/utils/geo-paths";

import { GeoPersonasSkeleton } from "./skeleton";

function GenerationCounter({ progress }: PersonaGenerationCounterProps) {
  const reducedMotion = useReducedMotion();
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center leading-none tabular-nums"
    >
      {reducedMotion ? (
        <span>{progress.step}</span>
      ) : (
        <Counter
          borderRadius={0}
          fontSize={14}
          gap={0}
          gradientHeight={0}
          horizontalPadding={0}
          value={progress.step}
        />
      )}
      <span className="leading-none">/{progress.total}</span>
    </span>
  );
}

function GeneratePersonasButton({
  hasPersonas,
  progress,
  onClick,
}: GeneratePersonasButtonProps) {
  const t = useTranslations("geo.pages.personas");
  const label = hasPersonas ? t("addPersonas") : t("generatePersonas");
  const stepLabel = progress ? t(`generationSteps.${progress.stepKey}`) : "";
  const progressLabel = progress
    ? t("progress", {
        label: stepLabel,
        step: progress.step,
        total: progress.total,
      })
    : "";
  const isGenerating = progress !== null;
  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {progressLabel}
      </span>
      <Button
        aria-label={progress ? progressLabel : label}
        className="h-9 gap-2 px-3"
        disabled={isGenerating}
        onClick={onClick}
      >
        <HugeiconsIcon
          className={isGenerating ? "motion-safe:animate-spin" : undefined}
          icon={isGenerating ? Loading03Icon : UserGroupIcon}
          size={16}
        />
        {progress ? (
          <span className="inline-flex items-center gap-1.5 leading-none">
            <Shimmer
              as="span"
              className="text-primary-foreground/70 [--foreground:var(--primary-foreground)]"
            >
              {stepLabel}
            </Shimmer>
            <GenerationCounter progress={progress} />
          </span>
        ) : (
          label
        )}
      </Button>
    </div>
  );
}

export default function PageClient({ organizationSlug }: GeoPageClientProps) {
  return <GeoPersonasPageContent organizationSlug={organizationSlug} />;
}

function GeoPersonasPageContent({ organizationSlug }: GeoPageClientProps) {
  const t = useTranslations("geo.pages.personas");
  const tShared = useTranslations("geo.pages.shared");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
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
          <PageHeader
            description={t("description")}
            title={tCommon("labels.personas")}
          />
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
                {tGeoShared("setUpGeoTracking")}
              </Button>
            }
            description={t("setupDescription")}
            preview={
              <EmptyStateTablePreview
                columns={EMPTY_STATE_TABLE_COLUMNS.personas}
                rows={EMPTY_STATE_TABLE_ROWS}
              />
            }
            title={tShared("notSetUpTitle")}
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
        <PageHeader
          description={t("description")}
          title={tCommon("labels.personas")}
        >
          {headerAction}
        </PageHeader>

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
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={UserGroupIcon} />
              </EmptyMedia>
              <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
              <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <GeneratePersonasButton
                hasPersonas={false}
                onClick={onGenerateClick}
                progress={progress}
              />
            </EmptyContent>
          </Empty>
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
