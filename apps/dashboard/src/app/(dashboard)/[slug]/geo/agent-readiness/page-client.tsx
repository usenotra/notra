"use client";

import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AGENT_READINESS_PAGE_DESCRIPTION,
  AGENT_READINESS_PAGE_TITLE,
} from "@notra/geo-core/constants/agent-readiness";
import { getAgentReadinessScanErrorMessage } from "@notra/geo-core/utils/agent-readiness";
import { stripWebsiteProtocol } from "@notra/geo-core/utils/geo-website";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { EmptyStateReadinessPreview } from "@/components/empty-state-preview";
import { AgentReadinessChecklist } from "@/components/geo/agent-readiness/readiness-checklist";
import { AgentReadinessScanDialog } from "@/components/geo/agent-readiness/readiness-scan-dialog";
import { AgentReadinessScanningNotice } from "@/components/geo/agent-readiness/readiness-scanning-notice";
import { AgentReadinessScoreCard } from "@/components/geo/agent-readiness/readiness-score-card";
import { GeoSetupButton } from "@/components/geo/geo-setup-button";
import { PageContainer } from "@/components/layout/container";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  useAgentReadiness,
  useAgentReadinessScan,
  useGeoSettings,
} from "@/lib/hooks/use-geo";
import type { AgentReadinessBodyProps } from "@/types/agent-readiness";
import type { GeoPageClientProps } from "@/types/geo";

import { AgentReadinessSkeleton } from "./skeleton";

function ReadinessBody({
  data,
  isScanPending,
  onRequestScan,
}: AgentReadinessBodyProps) {
  const { report, scan, targetUrl, history } = data;
  const isScanning = isScanPending || scan?.status === "running";
  const previousScore =
    history.length > 1 ? (history.at(-2)?.score ?? null) : null;
  const scanErrorMessage = getAgentReadinessScanErrorMessage(
    scan?.errorMessage,
    targetUrl
  );

  if (!report) {
    if (isScanning) {
      return <AgentReadinessScanningNotice targetUrl={targetUrl} />;
    }
    return (
      <EmptyState
        actionLabel={
          scan?.status === "failed" ? "Try again" : "Scan your website"
        }
        description={
          scan?.status === "failed" ? (
            scanErrorMessage
          ) : (
            <>
              Check how ready{" "}
              <strong className="font-semibold">
                {stripWebsiteProtocol(targetUrl)}
              </strong>{" "}
              is for AI agents. The scan is public and takes a few minutes.
            </>
          )
        }
        onActionClick={onRequestScan}
        preview={<EmptyStateReadinessPreview />}
        title={scan?.status === "failed" ? "Scan failed" : "No scan yet"}
        titleIcon={
          scan?.status === "failed" ? (
            <HugeiconsIcon
              className="text-destructive size-5"
              icon={AlertCircleIcon}
              strokeWidth={2}
            />
          ) : null
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {scan?.status === "failed" ? (
        <p className="text-destructive bg-destructive/5 rounded-xl border px-4 py-3 text-sm">
          The latest rescan failed: {scanErrorMessage} Showing the last
          completed report.
        </p>
      ) : null}
      <AgentReadinessScoreCard
        isScanning={isScanning}
        onRescan={onRequestScan}
        previousScore={previousScore}
        report={report}
      />
      <AgentReadinessChecklist issues={report.issues} targetUrl={targetUrl} />
    </div>
  );
}

export default function PageClient({ organizationSlug }: GeoPageClientProps) {
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const orgFromList = getOrganization(organizationSlug);
  const organization =
    activeOrganization?.slug === organizationSlug
      ? activeOrganization
      : orgFromList;
  const organizationId = organization?.id ?? "";

  const { data: settingsData, isPending: isSettingsPending } =
    useGeoSettings(organizationId);
  const readinessQuery = useAgentReadiness(organizationId);
  const scanMutation = useAgentReadinessScan(organizationId);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!(isSettingsPending || settingsData?.settings)) {
    return (
      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <header className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {AGENT_READINESS_PAGE_TITLE}
            </h1>
            <p className="text-muted-foreground">
              {AGENT_READINESS_PAGE_DESCRIPTION}
            </p>
          </header>
          <EmptyState
            action={<GeoSetupButton organizationId={organizationId} />}
            description="The scan uses the website from your GEO project. Set up GEO tracking first."
            preview={<EmptyStateReadinessPreview />}
            title="Set up GEO tracking"
          />
        </div>
      </PageContainer>
    );
  }

  if (readinessQuery.isPending) {
    return <AgentReadinessSkeleton />;
  }

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {AGENT_READINESS_PAGE_TITLE}
          </h1>
          <p className="text-muted-foreground">
            {AGENT_READINESS_PAGE_DESCRIPTION}
          </p>
        </header>

        {readinessQuery.data ? (
          <ReadinessBody
            data={readinessQuery.data}
            isScanPending={scanMutation.isPending}
            onRequestScan={() => setDialogOpen(true)}
          />
        ) : (
          <EmptyState
            description="Agent readiness could not be loaded. Make sure your brand settings include a website URL."
            preview={<EmptyStateReadinessPreview />}
            title="Nothing to show"
          />
        )}
      </div>

      <AgentReadinessScanDialog
        isPending={scanMutation.isPending}
        onConfirm={() => {
          setDialogOpen(false);
          scanMutation.mutate();
        }}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
      />
    </PageContainer>
  );
}
