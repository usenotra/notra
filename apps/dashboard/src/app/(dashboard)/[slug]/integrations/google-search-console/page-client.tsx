"use client";

import { MoreHorizontalIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { GscQueryRow } from "@notra/ai/types/google-search-console";
import { GSC_OAUTH_AUTHORIZE_PATH } from "@notra/geo-core/constants/google-search-console";
import type { GeoSearchConsoleStatus } from "@notra/geo-core/types/google-search-console";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { Google } from "@notra/ui/components/ui/svgs/google";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import {
  EmptyStateCardsPreview,
  EmptyStateTablePreview,
} from "@/components/empty-state-preview";
import { SearchConsolePropertyPicker } from "@/components/geo/search-console-card";
import { StatusSpinner } from "@/components/geo/status-spinner";
import { AddGoogleSearchConsoleIntegrationDialog } from "@/components/integrations/add-google-search-console-integration-dialog";
import { PageContainer } from "@/components/layout/container";
import { PageHeading } from "@/components/layout/page-heading";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useFormatRelative } from "@/lib/hooks/use-format-relative";
import {
  useGeoSuggestions,
  useGscDisconnect,
  useGscKeywords,
  useGscSites,
  useGscStatus,
  useGscSync,
} from "@/lib/hooks/use-geo";
import { useGscConnectionToast } from "@/lib/hooks/use-gsc-connection-toast";
import type {
  GoogleSearchConsoleAddedSuggestionsProps,
  GoogleSearchConsoleChangePropertyDialogProps,
  GoogleSearchConsoleConnectionMenuProps,
  GoogleSearchConsoleFactProps,
  GoogleSearchConsoleIntegrationCardProps,
  GoogleSearchConsoleLastSyncPanelProps,
  GoogleSearchConsolePageBodyProps,
  GoogleSearchConsolePageClientProps,
  GoogleSearchConsoleQueryTableProps,
  GoogleSearchConsoleSyncButtonProps,
} from "@/types/integrations/pages";
import { formatCount, formatOneDecimal } from "@/utils/format";
import { formatGscSiteUrl } from "@/utils/gsc-site-url";

import { GoogleSearchConsolePageSkeleton } from "./skeleton";

const VISIBLE_QUERIES = 8;

const searchConsoleEmptyPreview = (
  <EmptyStateTablePreview
    columns={EMPTY_STATE_TABLE_COLUMNS.searchConsole}
    rows={EMPTY_STATE_TABLE_ROWS}
  />
);

function summarizeQueries(queries: readonly GscQueryRow[]) {
  let clicks = 0;
  let impressions = 0;
  let weightedPosition = 0;
  for (const query of queries) {
    clicks += query.clicks;
    impressions += query.impressions;
    weightedPosition += query.position * query.impressions;
  }
  return {
    clicks,
    impressions,
    position: impressions > 0 ? weightedPosition / impressions : null,
    queries: queries.length,
  };
}

function displayStat(loading: boolean, value: string): string {
  if (loading) {
    return "—";
  }
  return value;
}

function connectionLabelKey(status: GeoSearchConsoleStatus) {
  if (status.status === "reauth_required") {
    return "needsReconnect";
  }
  if (!status.siteUrl) {
    return "chooseProperty";
  }
  return "enabled";
}

function ChangePropertyDialog({
  callbackPath,
  onOpenChange,
  open,
  organizationId,
}: GoogleSearchConsoleChangePropertyDialogProps) {
  const tCommon2 = useTranslations("common");
  const sites = useGscSites(organizationId, open);
  const authorizeUrl = `${GSC_OAUTH_AUTHORIZE_PATH}?${new URLSearchParams({
    organizationId,
    callbackPath,
  }).toString()}`;

  let body = (
    <p className="text-muted-foreground px-4 text-sm md:px-0">
      {sites.isError
        ? tCommon2("messages.searchConsolePropertiesCouldNot")
        : tCommon2("messages.noPropertiesWereFoundFor")}
    </p>
  );

  if (sites.isPending) {
    body = (
      <div className="text-muted-foreground flex items-center gap-2 px-4 py-3 text-sm md:px-0">
        <StatusSpinner />
        {tCommon2("labels.loadingProperties")}
      </div>
    );
  } else if (sites.data?.sites.length) {
    body = (
      <div className="px-4 md:px-0">
        <SearchConsolePropertyPicker
          onSelected={() => onOpenChange(false)}
          organizationId={organizationId}
          sites={sites.data.sites}
          websiteUrl={null}
        />
      </div>
    );
  }

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {tCommon2("labels.changeSearchConsoleProperty")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {tCommon2("messages.yourCurrentPropertyStaysConnected")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {sites.isPending || sites.data?.sites.length ? (
          body
        ) : (
          <div className="space-y-4">
            {body}
            <div className="px-4 md:px-0">
              <Button
                className="w-full"
                nativeButton={false}
                render={
                  <a href={authorizeUrl}>
                    {tCommon2("labels.reconnectGoogle")}
                  </a>
                }
                variant="outline"
              />
            </div>
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function SyncNowButton({ busy, onSync }: GoogleSearchConsoleSyncButtonProps) {
  const tCommon2 = useTranslations("common");
  const label = busy ? tCommon2("labels.syncing") : tCommon2("labels.syncNow");
  return (
    <Button disabled={busy} onClick={onSync} size="sm" variant="outline">
      {busy ? <StatusSpinner /> : null}
      {label}
    </Button>
  );
}

function QueryTable({ queries }: GoogleSearchConsoleQueryTableProps) {
  const t = useTranslations("integrations.gscPage");
  const tCommon2 = useTranslations("common");
  const locale = useLocale();
  if (queries.length === 0) {
    return null;
  }

  const visibleQueries = queries.slice(0, VISIBLE_QUERIES);
  const columns: TableColumn<GscQueryRow>[] = [
    {
      key: "query",
      header: tCommon2("labels.query"),
      width: "2fr",
      cell: (query) => (
        <span className="font-medium" title={query.query}>
          {query.query}
        </span>
      ),
    },
    {
      key: "clicks",
      header: tCommon2("labels.clicks"),
      align: "right",
      cell: (query) => formatCount(query.clicks, locale),
    },
    {
      key: "impressions",
      header: tCommon2("labels.impressions"),
      align: "right",
      cell: (query) => formatCount(query.impressions, locale),
    },
    {
      key: "position",
      header: tCommon2("labels.position"),
      align: "right",
      cell: (query) => formatOneDecimal(query.position, locale),
    },
  ];
  return (
    <DataTable
      autoHeight
      columns={columns}
      data={visibleQueries}
      footer={
        queries.length > VISIBLE_QUERIES ? (
          <p className="text-muted-foreground px-4 py-2.5 text-xs">
            {t("table.showing", {
              visible: VISIBLE_QUERIES,
              total: formatCount(queries.length, locale),
            })}
          </p>
        ) : undefined
      }
      getRowId={(query) => query.query}
      rowHeight={TABLE_ROW_HEIGHT}
      rowSizing="content"
    />
  );
}

function AddedSuggestions({
  isError,
  onRetry,
  organizationSlug,
  suggestions,
}: GoogleSearchConsoleAddedSuggestionsProps) {
  const t = useTranslations("integrations.gscPage");
  const tCommon = useTranslations("common");

  if (isError) {
    return (
      <EmptyState
        action={
          <Button onClick={onRetry} size="sm" variant="outline">
            {tCommon("actions.retry")}
          </Button>
        }
        description={t("suggestions.loadFailedDescription")}
        title={t("suggestions.loadFailedTitle")}
      />
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  const visibleSuggestions = suggestions.slice(0, VISIBLE_QUERIES);
  const suggestionColumns: TableColumn<(typeof visibleSuggestions)[number]>[] =
    [
      {
        key: "prompt",
        header: t("suggestions.promptSuggestion"),
        width: "1.6fr",
        cell: (suggestion) => (
          <span title={suggestion.prompt}>{suggestion.prompt}</span>
        ),
      },
      {
        key: "query",
        header: t("suggestions.fromQuery"),
        cell: (suggestion) => (
          <span className="text-muted-foreground">
            {suggestion.keywords[0]?.query ?? "—"}
          </span>
        ),
      },
    ];
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-medium">{tCommon("labels.added")}</h3>
        <Link
          className="text-muted-foreground text-sm underline underline-offset-4"
          href={`/${organizationSlug}/geo/prompts`}
        >
          {tCommon("labels.prompts")}
        </Link>
      </div>
      <DataTable
        autoHeight
        columns={suggestionColumns}
        data={visibleSuggestions}
        getRowId={(suggestion) => suggestion.id}
        rowHeight={TABLE_ROW_HEIGHT}
        rowSizing="content"
      />
    </div>
  );
}

function LastSyncPanel({
  busy,
  lastSyncedAt,
  onSync,
  organizationId,
  organizationSlug,
}: GoogleSearchConsoleLastSyncPanelProps) {
  const t = useTranslations("integrations.gscPage");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const keywords = useGscKeywords(organizationId);
  const suggestions = useGeoSuggestions(organizationId);
  const queries = keywords.data?.keywords ?? [];
  const added = suggestions.data?.suggestions ?? [];
  const summary = summarizeQueries(queries);
  const loading = keywords.isPending || suggestions.isPending;

  if (keywords.isError) {
    return (
      <EmptyState
        action={
          <Button
            onClick={() => keywords.refetch()}
            size="sm"
            variant="outline"
          >
            {tCommon("actions.retry")}
          </Button>
        }
        description={t("lastSync.loadFailedDescription")}
        preview={searchConsoleEmptyPreview}
        title={t("lastSync.loadFailedTitle")}
      />
    );
  }

  if (!loading && queries.length === 0) {
    const syncedBefore = lastSyncedAt !== null;
    return (
      <EmptyState
        action={<SyncNowButton busy={busy} onSync={onSync} />}
        description={
          syncedBefore
            ? t("lastSync.noQueriesDescription")
            : t("lastSync.noSyncDescription")
        }
        preview={searchConsoleEmptyPreview}
        title={
          syncedBefore
            ? t("lastSync.noQueriesTitle")
            : t("lastSync.noSyncTitle")
        }
      />
    );
  }

  const position =
    summary.position === null
      ? "—"
      : formatOneDecimal(summary.position, locale);
  const suggestionCount = suggestions.isError
    ? "—"
    : formatCount(added.length, locale);
  const stats = [
    {
      key: "queries",
      label: t("lastSync.queries"),
      value: displayStat(loading, formatCount(summary.queries, locale)),
    },
    {
      key: "clicks",
      label: tCommon("labels.clicks"),
      value: displayStat(loading, formatCount(summary.clicks, locale)),
    },
    {
      key: "impressions",
      label: tCommon("labels.impressions"),
      value: displayStat(loading, formatCount(summary.impressions, locale)),
    },
    {
      key: "position",
      label: tCommon("labels.avgPosition"),
      value: displayStat(loading, position),
    },
    {
      key: "suggestions",
      label: tCommon("labels.suggestions"),
      value: displayStat(loading, suggestionCount),
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">
          {tIntegrationsShared("lastSync")}
        </h2>
        <SyncNowButton busy={busy} onSync={onSync} />
      </div>
      <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-5">
        {stats.map((stat) => (
          <div className="bg-background px-4 py-3" key={stat.key}>
            <p className="text-muted-foreground text-xs">{stat.label}</p>
            <p className="mt-1 text-lg font-medium tabular-nums">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
      <QueryTable queries={queries} />
      <AddedSuggestions
        isError={suggestions.isError}
        onRetry={() => suggestions.refetch()}
        organizationSlug={organizationSlug}
        suggestions={loading ? [] : added}
      />
    </section>
  );
}

function ConnectionFact({ label, value }: GoogleSearchConsoleFactProps) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium" title={value}>
        {value}
      </dd>
    </div>
  );
}

function ConnectionFacts({ status }: { status: GeoSearchConsoleStatus }) {
  const t = useTranslations("integrations.gscPage");
  const tCommon2 = useTranslations("common");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const formatRelative = useFormatRelative();
  const lastSync = status.lastSyncedAt
    ? formatRelative(status.lastSyncedAt)
    : tCommon2("labels.notYet");
  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      <ConnectionFact
        label={tCommon2("labels.account")}
        value={status.email ?? t("facts.googleAccount")}
      />
      <ConnectionFact
        label={tIntegrationsShared("lastSync")}
        value={lastSync}
      />
      <ConnectionFact
        label={tCommon2("labels.schedule")}
        value={
          status.weeklySyncScheduled
            ? tCommon2("labels.weekly")
            : tCommon2("labels.manual")
        }
      />
    </dl>
  );
}

function PropertyNotice({
  organizationId,
  status,
}: {
  organizationId: string;
  status: GeoSearchConsoleStatus;
}) {
  const t = useTranslations("integrations.gscPage");
  const tCommon2 = useTranslations("common");

  if (status.status === "reauth_required") {
    return (
      <p className="text-muted-foreground text-sm">{t("accessExpired")}</p>
    );
  }
  if (status.lastError) {
    return (
      <p className="text-destructive text-sm text-pretty wrap-anywhere">
        {status.lastError}
      </p>
    );
  }
  if (status.siteUrl) {
    return null;
  }
  if (status.sites.length > 0) {
    return (
      <SearchConsolePropertyPicker
        organizationId={organizationId}
        sites={status.sites}
        websiteUrl={null}
      />
    );
  }
  return (
    <p className="text-muted-foreground text-sm">
      {tCommon2("messages.noPropertiesWereFoundFor")}
    </p>
  );
}

function ConnectionMenu({
  busy,
  hasProperty,
  label,
  needsReconnect,
  onChangeProperty,
  onDisconnect,
  onReconnect,
}: GoogleSearchConsoleConnectionMenuProps) {
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon = useTranslations("common");

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <Badge variant={needsReconnect ? "secondary" : "default"}>{label}</Badge>
      {needsReconnect ? (
        <Button onClick={onReconnect} size="sm">
          {tIntegrationsShared("reconnect")}
        </Button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button disabled={busy} size="icon-sm" variant="ghost">
              <HugeiconsIcon
                aria-label={tIntegrationsShared("moreOptions")}
                className="size-4"
                icon={MoreHorizontalIcon}
              />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {hasProperty ? (
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={onChangeProperty}
            >
              {tCommon("labels.changeProperty")}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={onDisconnect}
            variant="destructive"
          >
            {tCommon("actions.disconnect")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function GoogleSearchConsoleIntegrationCard({
  callbackPath,
  onReconnect,
  organizationId,
  organizationSlug,
  status,
}: GoogleSearchConsoleIntegrationCardProps) {
  const t = useTranslations("integrations.gscPage");
  const tCommon = useTranslations("common");
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const sync = useGscSync(organizationId);
  const disconnect = useGscDisconnect(organizationId);
  const busy = sync.isPending || disconnect.isPending;
  const labelKey = connectionLabelKey(status);
  const needsReconnect = status.status === "reauth_required";
  const hasProperty = Boolean(status.siteUrl) && !needsReconnect;
  const title = status.siteUrl
    ? formatGscSiteUrl(status.siteUrl)
    : "Google Search Console";

  return (
    <>
      <div className="space-y-6">
        <TitleCard
          action={
            <ConnectionMenu
              busy={busy}
              hasProperty={hasProperty}
              label={
                labelKey === "enabled"
                  ? tCommon("states.enabled")
                  : labelKey === "chooseProperty"
                    ? tCommon("labels.chooseProperty")
                    : t(`status.${labelKey}`)
              }
              needsReconnect={needsReconnect}
              onChangeProperty={() => setPropertyDialogOpen(true)}
              onDisconnect={() => disconnect.mutate()}
              onReconnect={onReconnect}
            />
          }
          heading={title}
          icon={<Google />}
        >
          <div className="space-y-4">
            <ConnectionFacts status={status} />
            <PropertyNotice organizationId={organizationId} status={status} />
          </div>
        </TitleCard>
        {hasProperty ? (
          <LastSyncPanel
            busy={busy}
            lastSyncedAt={status.lastSyncedAt}
            onSync={() => sync.mutate()}
            organizationId={organizationId}
            organizationSlug={organizationSlug}
          />
        ) : null}
      </div>
      {hasProperty ? (
        <ChangePropertyDialog
          callbackPath={callbackPath}
          onOpenChange={setPropertyDialogOpen}
          open={propertyDialogOpen}
          organizationId={organizationId}
        />
      ) : null}
    </>
  );
}

function GoogleSearchConsolePageBody({
  callbackPath,
  onConnect,
  onReconnect,
  onRetry,
  organizationId,
  organizationSlug,
  showError,
  showLoading,
  status,
}: GoogleSearchConsolePageBodyProps) {
  const t = useTranslations("integrations.gscPage");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon = useTranslations("common");

  if (showLoading) {
    return <GoogleSearchConsolePageSkeleton />;
  }
  if (showError) {
    return (
      <EmptyState
        action={
          <Button onClick={onRetry} size="sm" variant="outline">
            {tCommon("actions.retry")}
          </Button>
        }
        description={t("loadFailedDescription")}
        title={t("loadFailedTitle")}
      />
    );
  }
  if (!status?.connected) {
    const unconfigured = status?.configured === false;
    return (
      <EmptyState
        action={
          unconfigured ? null : (
            <Button onClick={onConnect} size="sm" variant="outline">
              {tCommon("labels.connectSearchConsole")}
            </Button>
          )
        }
        description={
          unconfigured
            ? tIntegrationsShared("googleSearchConsoleIsNot")
            : t("emptyDescription")
        }
        preview={<EmptyStateCardsPreview count={2} variant="integration" />}
        title={t("emptyTitle")}
      />
    );
  }
  return (
    <div className="grid gap-4">
      <GoogleSearchConsoleIntegrationCard
        callbackPath={callbackPath}
        onReconnect={onReconnect}
        organizationId={organizationId}
        organizationSlug={organizationSlug}
        status={status}
      />
    </div>
  );
}

export default function PageClient({
  organizationSlug,
}: GoogleSearchConsolePageClientProps) {
  const t = useTranslations("integrations.gscPage");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon2 = useTranslations("common");
  const { getOrganization } = useOrganizationsContext();
  const organization = getOrganization(organizationSlug);
  const pathname = usePathname();
  const { projectId } = useGeoProjectScope();
  const [dialogOpen, setDialogOpen] = useState(false);
  const organizationId = organization?.id ?? "";

  useGscConnectionToast();

  const {
    data: status,
    isError,
    isLoading,
    refetch,
  } = useGscStatus(organizationId);

  const needsReconnect = status?.status === "reauth_required";
  const canConnect =
    status?.configured !== false && (!status?.connected || needsReconnect);
  const showLoading = !!organizationId && isLoading && !status;
  const showError = !showLoading && isError && !status;
  const callbackPath = projectId
    ? `${pathname}?${new URLSearchParams({ project: projectId })}`
    : pathname;
  const authorizeUrl = `${GSC_OAUTH_AUTHORIZE_PATH}?${new URLSearchParams({
    organizationId,
    callbackPath,
  }).toString()}`;

  useHotkey("C", () => setDialogOpen(true), {
    enabled: canConnect && !dialogOpen,
  });

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading description={t("description")} title={t("title")}>
          {canConnect ? (
            <Button className="gap-1.5" onClick={() => setDialogOpen(true)}>
              <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
              {needsReconnect
                ? tIntegrationsShared("reconnect")
                : tCommon2("labels.connectSearchConsole")}
              <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
            </Button>
          ) : null}
        </PageHeading>

        <GoogleSearchConsolePageBody
          callbackPath={callbackPath}
          onConnect={() => setDialogOpen(true)}
          onReconnect={() => setDialogOpen(true)}
          onRetry={() => refetch()}
          organizationId={organizationId}
          organizationSlug={organizationSlug}
          showError={showError}
          showLoading={showLoading}
          status={status}
        />
      </div>

      <AddGoogleSearchConsoleIntegrationDialog
        authorizeUrl={authorizeUrl}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        reauth={needsReconnect}
      />
    </PageContainer>
  );
}
