"use client";

import { Rocket01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@notra/ui/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/button";
import { PageHeader } from "@/components/layout/page-header";
import { useSite } from "@/components/sites/site-context";
import { SiteDeploymentsTable } from "@/components/sites/site-deployments-table";
import {
  SITE_DEPLOYMENT_ENVIRONMENT_FILTERS,
  SITE_DEPLOYMENT_STATUS_FILTERS,
} from "@/constants/sites";
import {
  useDeployLatest,
  useSiteDeploymentsList,
} from "@/lib/hooks/use-site-deployments";
import type {
  SiteDeployment,
  SiteDeploymentEnvironmentFilter,
  SiteDeploymentFilters,
  SiteDeploymentStatusFilter,
} from "@/types/sites";

const NO_FILTERS: SiteDeploymentFilters = {
  environment: "all",
  status: "all",
};

function matchesStatus(
  deployment: SiteDeployment,
  filter: SiteDeploymentStatusFilter | "all"
): boolean {
  if (filter === "all") {
    return true;
  }
  // Uploading takes a second; it reads as part of the build.
  if (filter === "building") {
    return (
      deployment.status === "building" || deployment.status === "uploading"
    );
  }
  return deployment.status === filter;
}

function matchesFilters(
  deployment: SiteDeployment,
  filters: SiteDeploymentFilters
): boolean {
  const environmentOk =
    filters.environment === "all" || filters.environment === deployment.kind;
  return environmentOk && matchesStatus(deployment, filters.status);
}

function isEnvironmentFilter(
  value: string | null
): value is SiteDeploymentEnvironmentFilter {
  return SITE_DEPLOYMENT_ENVIRONMENT_FILTERS.some((option) => option === value);
}

function isStatusFilter(
  value: string | null
): value is SiteDeploymentStatusFilter | "all" {
  return SITE_DEPLOYMENT_STATUS_FILTERS.some((option) => option === value);
}

export function SiteDeploymentsPage() {
  const { organizationId, organizationSlug, siteId, detail } = useSite();
  const t = useTranslations("sites.deploymentsPage");
  const tDetail = useTranslations("sites.detail");
  const tKinds = useTranslations("sites.kinds");
  const scope = { organizationId, siteId };
  const listQuery = useSiteDeploymentsList(scope);
  const deployLatest = useDeployLatest(scope);
  const [filters, setFilters] = useState<SiteDeploymentFilters>(NO_FILTERS);
  // The site layout already holds the latest 30; show those until the full list arrives.
  const deployments: SiteDeployment[] = listQuery.data ?? detail.deployments;
  const visible = deployments.filter((deployment) =>
    matchesFilters(deployment, filters)
  );
  const filtered = filters.environment !== "all" || filters.status !== "all";
  const suspended = detail.site.status === "suspended";

  const environmentLabel = (value: SiteDeploymentEnvironmentFilter) =>
    value === "all" ? t("filters.allEnvironments") : tKinds(value);
  const statusLabel = (value: SiteDeploymentStatusFilter | "all") =>
    value === "all" ? t("filters.allStatuses") : t(`statusFilters.${value}`);

  const deployButton = (variant: "default" | "outline") => (
    <Button
      disabled={suspended}
      loading={deployLatest.isPending}
      onClick={() => deployLatest.mutate()}
      size={variant === "default" ? "default" : "sm"}
      variant={variant}
    >
      <HugeiconsIcon icon={Rocket01Icon} size={16} strokeWidth={1.5} />
      {tDetail("deployLatest")}
    </Button>
  );

  const emptyState = filtered ? (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{t("noMatches.title")}</EmptyTitle>
        <EmptyDescription>{t("noMatches.description")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          onClick={() => setFilters(NO_FILTERS)}
          size="sm"
          variant="outline"
        >
          {t("filters.clear")}
        </Button>
      </EmptyContent>
    </Empty>
  ) : (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={Rocket01Icon} strokeWidth={1.5} />
        </EmptyMedia>
        <EmptyTitle>{t("empty.title")}</EmptyTitle>
        <EmptyDescription>
          {t("empty.description", { branch: detail.site.productionBranch })}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>{deployButton("outline")}</EmptyContent>
    </Empty>
  );

  return (
    <>
      <PageHeader
        description={t("description")}
        title={tDetail("tabs.deployments")}
      >
        {deployButton("default")}
      </PageHeader>

      {deployments.length > 0 ? (
        <div
          aria-label={t("filters.label")}
          className="flex flex-wrap items-center gap-2"
          role="toolbar"
        >
          <Select
            onValueChange={(value: string | null) => {
              if (isEnvironmentFilter(value)) {
                setFilters((previous) => ({ ...previous, environment: value }));
              }
            }}
            value={filters.environment}
          >
            <SelectTrigger
              aria-label={t("filters.environment")}
              className="w-full sm:w-44"
            >
              <SelectValue>
                {(value: string) =>
                  isEnvironmentFilter(value) ? environmentLabel(value) : value
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SITE_DEPLOYMENT_ENVIRONMENT_FILTERS.map((option) => (
                <SelectItem key={option} value={option}>
                  {environmentLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value: string | null) => {
              if (isStatusFilter(value)) {
                setFilters((previous) => ({ ...previous, status: value }));
              }
            }}
            value={filters.status}
          >
            <SelectTrigger
              aria-label={t("filters.status")}
              className="w-full sm:w-40"
            >
              <SelectValue>
                {(value: string) =>
                  isStatusFilter(value) ? statusLabel(value) : value
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SITE_DEPLOYMENT_STATUS_FILTERS.map((option) => (
                <SelectItem key={option} value={option}>
                  {statusLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span
            aria-live="polite"
            className="text-muted-foreground ml-auto hidden text-sm tabular-nums sm:inline"
          >
            {t("count", { count: visible.length })}
          </span>
        </div>
      ) : null}

      <SiteDeploymentsTable
        deployments={visible}
        emptyState={<div className="text-foreground w-full">{emptyState}</div>}
        highlightNewRows
        organizationId={organizationId}
        organizationSlug={organizationSlug}
        siteId={siteId}
        withActions
      />
    </>
  );
}
