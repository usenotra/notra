"use client";

import { PlusSignIcon, Upload01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useState } from "react";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { ConversationsCard } from "@/components/geo/conversations-card";
import { PromptsCsvImportDialog } from "@/components/geo/geo-csv-import-dialog";
import { GeoRangePicker } from "@/components/geo/geo-range-picker";
import { GeoSetupButton } from "@/components/geo/geo-setup-button";
import { PromptAddDialog } from "@/components/geo/prompt-add-dialog";
import { PromptSuggestions } from "@/components/geo/prompt-suggestions";
import { PromptsTable } from "@/components/geo/prompts-table";
import { PageContainer } from "@/components/layout/container";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import {
  useGeoPromptResults,
  useGeoSettings,
  useIsGeoScanning,
} from "@/lib/hooks/use-geo";
import { useGeoPromptsDb } from "@/lib/hooks/use-geo-db";
import { useGeoRange } from "@/lib/hooks/use-geo-range";
import { withGeoProject } from "@/utils/geo-paths";

import { GeoPromptsSkeleton } from "./skeleton";

interface PageClientProps {
  organizationSlug: string;
}

export default function PageClient({ organizationSlug }: PageClientProps) {
  const { projectId } = useGeoProjectScope();
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const orgFromList = getOrganization(organizationSlug);
  const organization =
    activeOrganization?.slug === organizationSlug
      ? activeOrganization
      : orgFromList;
  const organizationId = organization?.id ?? "";

  const geoRange = useGeoRange();
  const { data: settingsData, isPending } = useGeoSettings(organizationId);
  const { prompts } = useGeoPromptsDb(organizationId);
  const { data: promptResults } = useGeoPromptResults(
    organizationId,
    geoRange.query
  );
  const isScanning = useIsGeoScanning(organizationId);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useHotkey("P", () => setAddOpen(true), { enabled: !addOpen && !importOpen });

  if (isPending) {
    return <GeoPromptsSkeleton />;
  }

  if (!settingsData?.settings) {
    return (
      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <header className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Prompts</h1>
            <p className="text-muted-foreground">
              The questions we ask AI engines on your behalf
            </p>
          </header>
          <EmptyState
            action={<GeoSetupButton organizationId={organizationId} />}
            description="Set up GEO tracking first, then manage the prompts scanned across AI engines."
            preview={
              <EmptyStateTablePreview
                columns={EMPTY_STATE_TABLE_COLUMNS.prompts}
                rows={EMPTY_STATE_TABLE_ROWS}
              />
            }
            title="Not set up yet"
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Prompts</h1>
            <p className="text-muted-foreground">
              The questions we ask AI engines on your behalf
            </p>
          </div>
          <div className="flex items-center gap-2">
            <GeoRangePicker control={geoRange} />
            <Button
              className="gap-1.5"
              onClick={() => setImportOpen(true)}
              variant="outline"
            >
              <HugeiconsIcon className="size-4" icon={Upload01Icon} />
              Import CSV
            </Button>
            <Button className="gap-1.5" onClick={() => setAddOpen(true)}>
              <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
              Add Prompt
              <Kbd className="ml-1 hidden sm:inline-flex">P</Kbd>
            </Button>
          </div>
        </header>
        <PromptsTable
          isScanning={isScanning}
          organizationId={organizationId}
          prompts={prompts}
          results={promptResults?.results ?? []}
        />
        <ConversationsCard organizationId={organizationId} />
        <PromptSuggestions
          callbackPath={withGeoProject(
            `/${organizationSlug}/geo/prompts`,
            projectId
          )}
          organizationId={organizationId}
        />
      </div>
      <PromptAddDialog
        onOpenChange={setAddOpen}
        open={addOpen}
        organizationId={organizationId}
      />
      <PromptsCsvImportDialog
        onOpenChange={setImportOpen}
        open={importOpen}
        organizationId={organizationId}
      />
    </PageContainer>
  );
}
