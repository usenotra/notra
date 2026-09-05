"use client";

import { Loading03Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@notra/ui/components/shared/responsive-alert-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { PersonasTable } from "@/components/geo/personas-table";
import { GeoTableSkeleton } from "@/components/geo/skeleton-parts";
import { PageContainer } from "@/components/layout/container";
import {
  GeoProjectProvider,
  useGeoProjectScope,
} from "@/components/providers/geo-project-provider";
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
  GEO_PERSONAS_REGENERATE_DESCRIPTION,
  GEO_PERSONAS_REGENERATE_TITLE,
} from "@/constants/geo-personas";
import { useGeoSettings } from "@/lib/hooks/use-geo";
import {
  useGeoPersonas,
  useGeoPersonasGenerate,
} from "@/lib/hooks/use-geo-personas";
import { useGeoProjectQueryState } from "@/lib/hooks/use-geo-project-query";
import { usePersonaGenerationProgress } from "@/lib/hooks/use-persona-generation-progress";
import type { GeoPageClientProps } from "@/types/geo";
import type {
  GeneratePersonasButtonProps,
  PersonaGenerationProgress,
  PersonasRegenerateDialogProps,
} from "@/types/geo-personas-ui";
import { withGeoProject } from "@/utils/geo-paths";

import { GeoPersonasSkeleton } from "./skeleton";

const COUNTER_SLIDE_PX = 8;

function PageHeader({ action }: { action?: ReactNode }) {
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

function PersonasRegenerateDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: PersonasRegenerateDialogProps) {
  return (
    <ResponsiveAlertDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveAlertDialogContent>
        <ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogTitle>
            {GEO_PERSONAS_REGENERATE_TITLE}
          </ResponsiveAlertDialogTitle>
          <ResponsiveAlertDialogDescription>
            {GEO_PERSONAS_REGENERATE_DESCRIPTION}
          </ResponsiveAlertDialogDescription>
        </ResponsiveAlertDialogHeader>
        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel disabled={isPending}>
            Cancel
          </ResponsiveAlertDialogCancel>
          <ResponsiveAlertDialogAction
            disabled={isPending}
            onClick={onConfirm}
            variant="destructive"
          >
            {isPending ? "Generating…" : "Replace personas"}
          </ResponsiveAlertDialogAction>
        </ResponsiveAlertDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  );
}

function GenerationCounter({
  progress,
}: {
  progress: PersonaGenerationProgress;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <span className="inline-flex items-center leading-none tabular-nums">
      <span className="relative inline-block h-[1em] w-[1ch] overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            animate={{ y: 0, opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center leading-none"
            exit={{ y: reducedMotion ? 0 : -COUNTER_SLIDE_PX, opacity: 0 }}
            initial={{ y: reducedMotion ? 0 : COUNTER_SLIDE_PX, opacity: 0 }}
            key={progress.step}
            transition={{ duration: reducedMotion ? 0 : 0.25, ease: "easeOut" }}
          >
            {progress.step}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="leading-none">/{progress.total}</span>
    </span>
  );
}

function GeneratePersonasButton({
  hasPersonas,
  progress,
  onClick,
}: GeneratePersonasButtonProps) {
  const label = hasPersonas ? "Regenerate personas" : "Generate personas";
  const isGenerating = progress !== null;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Button
        aria-label={
          progress
            ? `Generating personas, step ${progress.step} of ${progress.total}`
            : label
        }
        className="gap-1.5"
        disabled={isGenerating}
        onClick={onClick}
      >
        <HugeiconsIcon
          className={isGenerating ? "animate-spin" : undefined}
          icon={isGenerating ? Loading03Icon : UserGroupIcon}
          size={16}
        />
        {progress ? (
          <span className="inline-flex items-center gap-1 leading-none">
            <span>Generating</span>
            <GenerationCounter progress={progress} />
          </span>
        ) : (
          label
        )}
      </Button>
      {progress ? (
        <p aria-live="polite" className="text-muted-foreground text-xs">
          {progress.label}
        </p>
      ) : null}
    </div>
  );
}

export default function PageClient({ organizationSlug }: GeoPageClientProps) {
  const [projectParam] = useGeoProjectQueryState();

  return (
    <GeoProjectProvider projectId={projectParam ?? undefined}>
      <GeoPersonasPageContent organizationSlug={organizationSlug} />
    </GeoProjectProvider>
  );
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
  const generatePersonas = useGeoPersonasGenerate(organizationId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const personas = personasData?.personas ?? [];
  const hasPersonas = personas.length > 0;
  const isGenerating = generatePersonas.isPending;
  const progress = usePersonaGenerationProgress(isGenerating);

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

  const onGenerateClick = () => {
    if (hasPersonas) {
      setConfirmOpen(true);
      return;
    }
    generatePersonas.mutate();
  };

  const isLoadingPersonas = isPersonasPending && !hasPersonas;
  const showEmptyState = !(isLoadingPersonas || hasPersonas);
  // The empty state already carries the primary call to action, so the header
  // only offers one once there is a set to replace. While the list is still
  // loading we do not know whether a set exists, so the button waits too:
  // otherwise it could replace personas without the confirmation dialog.
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
          <PersonasTable organizationId={organizationId} personas={personas} />
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

      <PersonasRegenerateDialog
        isPending={isGenerating}
        onConfirm={() => {
          setConfirmOpen(false);
          generatePersonas.mutate();
        }}
        onOpenChange={setConfirmOpen}
        open={confirmOpen}
      />
    </PageContainer>
  );
}
