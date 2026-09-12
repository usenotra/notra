"use client";

import { PencilEdit01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_GAPS_NAV_LINK } from "@notra/geo-core/constants/geo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useState } from "react";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { BriefHistory } from "@/components/geo/writer/brief-history";
import { GeoWriterNeedsSetup } from "@/components/geo/writer/page-gate";
import { WriteDialog } from "@/components/geo/writer/write-dialog";
import { PageContainer } from "@/components/layout/container";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import { GEO_WRITE_DIALOG_ENTRIES } from "@/constants/geo-analytics";
import { useGeoSettings } from "@/lib/hooks/use-geo";
import { useGeoWriterBriefs } from "@/lib/hooks/use-geo-writer";
import type { WriteDialogInitialState } from "@/types/components/geo-writer";
import type { GeoPageClientProps } from "@/types/geo";
import { withGeoProject } from "@/utils/geo-paths";
import { emptyWriteDialogState, geoContentPath } from "@/utils/geo-write-entry";

import { GeoWriterSkeleton } from "./skeleton";

export default function PageClient({ organizationSlug }: GeoPageClientProps) {
  const router = useRouter();
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
  const briefsQuery = useGeoWriterBriefs(organizationId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogInitial, setDialogInitial] =
    useState<WriteDialogInitialState | null>(null);

  const gapsHref = withGeoProject(
    `/${organizationSlug}${GEO_GAPS_NAV_LINK}`,
    projectId
  );

  const openDialog = useCallback((initial?: WriteDialogInitialState) => {
    setDialogInitial(initial ?? emptyWriteDialogState());
    setDialogOpen(true);
  }, []);

  if (!(isSettingsPending || settingsData?.settings)) {
    return (
      <GeoWriterNeedsSetup
        description="Plan a custom article from a prompt, type, brand, and competitors"
        organizationId={organizationId}
        title="Write"
      />
    );
  }

  if (isSettingsPending && !briefsQuery.data) {
    return <GeoWriterSkeleton />;
  }

  const briefs = briefsQuery.data?.briefs ?? [];
  let history: ReactNode;
  if (briefsQuery.isPending) {
    history = (
      <div className="min-h-0 flex-1">
        <GeoWriterSkeleton embedded />
      </div>
    );
  } else if (briefs.length === 0) {
    history = (
      <div className="min-h-0 flex-1 overflow-auto">
        <EmptyState
          action={
            <Button className="gap-1.5" onClick={() => openDialog()}>
              <HugeiconsIcon className="size-4" icon={PencilEdit01Icon} />
              New article
            </Button>
          }
          description="Start from a custom topic. After you approve the brief, the draft opens in Content."
          preview={
            <EmptyStateTablePreview
              columns={EMPTY_STATE_TABLE_COLUMNS.write}
              rows={EMPTY_STATE_TABLE_ROWS}
            />
          }
          title="No articles yet"
        />
      </div>
    );
  } else {
    history = (
      <BriefHistory
        briefs={briefs}
        onHover={(briefId) => {
          const summary = briefs.find((brief) => brief.id === briefId);
          if (summary?.postId) {
            router.prefetch(geoContentPath(organizationSlug, summary.postId));
          }
        }}
        onOpen={(briefId) => {
          const summary = briefs.find((brief) => brief.id === briefId);
          if (summary?.postId) {
            router.push(geoContentPath(organizationSlug, summary.postId));
          }
        }}
      />
    );
  }

  return (
    <PageContainer
      className="flex h-full min-h-full flex-1 flex-col overflow-hidden py-4 md:py-6"
      data-geo-write-page=""
    >
      <div className="flex min-h-0 w-full flex-1 flex-col gap-6 px-4 lg:px-6">
        <header className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Write</h1>
            <p className="text-muted-foreground max-w-2xl text-sm text-pretty">
              Plan a custom article from a topic, type, and brand. Questions
              engines already answer live on{" "}
              <Link
                className="hover:text-foreground underline decoration-from-font underline-offset-4"
                href={gapsHref}
              >
                Content Gaps
              </Link>
              .
            </p>
          </div>
          <Button className="gap-1.5" onClick={() => openDialog()}>
            <HugeiconsIcon className="size-4" icon={PencilEdit01Icon} />
            New article
          </Button>
        </header>

        {history}
      </div>

      {organizationId ? (
        <WriteDialog
          entry={GEO_WRITE_DIALOG_ENTRIES.WRITE_PAGE}
          initial={dialogInitial}
          onOpenChange={setDialogOpen}
          open={dialogOpen}
          organizationId={organizationId}
          organizationSlug={organizationSlug}
        />
      ) : null}
    </PageContainer>
  );
}
