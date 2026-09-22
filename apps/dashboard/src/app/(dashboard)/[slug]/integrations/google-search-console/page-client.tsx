"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { Google } from "@notra/ui/components/ui/svgs/google";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notra/ui/components/ui/table";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useHotkey } from "@tanstack/react-hotkeys";
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
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import {
  useGeoSuggestions,
  useGscDisconnect,
  useGscKeywords,
  useGscSites,
  useGscStatus,
  useGscSync,
} from "@/lib/hooks/use-geo";
import { useGscConnectionToast } from "@/lib/hooks/use-gsc-connection-toast";
import { GSC_ERROR_MESSAGES } from "@/lib/integrations/google-search-console/oauth-errors";
import type {
  GoogleSearchConsoleChangePropertyDialogProps,
  GoogleSearchConsoleIntegrationCardProps,
  GoogleSearchConsoleLastSyncPanelProps,
  GoogleSearchConsolePageClientProps,
} from "@/types/integrations/pages";
import { formatRelative } from "@/utils/format-relative";
import { formatGscSiteUrl } from "@/utils/gsc-site-url";

import { GoogleSearchConsolePageSkeleton } from "./skeleton";

const VISIBLE_QUERIES = 8;

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

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

function connectionLabel(status: GeoSearchConsoleStatus): string {
  if (status.status === "reauth_required") {
    return "Needs reconnect";
  }
  if (!status.siteUrl) {
    return "Choose property";
  }
  return "Enabled";
}

function ChangePropertyDialog({
  callbackPath,
  onOpenChange,
  open,
  organizationId,
}: GoogleSearchConsoleChangePropertyDialogProps) {
  const sites = useGscSites(organizationId, open);
  const authorizeUrl = `${GSC_OAUTH_AUTHORIZE_PATH}?${new URLSearchParams({
    organizationId,
    callbackPath,
  }).toString()}`;

  let body = (
    <p className="text-muted-foreground px-4 text-sm md:px-0">
      {sites.isError
        ? "Search Console properties could not be loaded. Reconnect Google and try again."
        : "No properties were found for this Google account."}
    </p>
  );

  if (sites.isPending) {
    body = (
      <div className="text-muted-foreground flex items-center gap-2 px-4 py-3 text-sm md:px-0">
        <StatusSpinner />
        Loading properties…
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
            Change Search Console property
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Your current property stays connected until you confirm a new one.
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
                render={<a href={authorizeUrl}>Reconnect Google</a>}
                variant="outline"
              />
            </div>
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function LastSyncPanel({
  busy,
  lastSyncedAt,
  onSync,
  organizationId,
  organizationSlug,
}: GoogleSearchConsoleLastSyncPanelProps) {
  const keywords = useGscKeywords(organizationId);
  const suggestions = useGeoSuggestions(organizationId);
  const queries = keywords.data?.keywords ?? [];
  const added = suggestions.data?.suggestions ?? [];
  const summary = summarizeQueries(queries);
  const visibleQueries = queries.slice(0, VISIBLE_QUERIES);
  const visibleSuggestions = added.slice(0, VISIBLE_QUERIES);
  const loading = keywords.isPending || suggestions.isPending;
  const stats = [
    { label: "Queries", value: formatCount(summary.queries) },
    { label: "Clicks", value: formatCount(summary.clicks) },
    { label: "Impressions", value: formatCount(summary.impressions) },
    {
      label: "Avg. position",
      value: summary.position === null ? "—" : summary.position.toFixed(1),
    },
    { label: "Suggestions", value: formatCount(added.length) },
  ];

  if (!loading && queries.length === 0) {
    return (
      <EmptyState
        action={
          <Button disabled={busy} onClick={onSync} size="sm" variant="outline">
            {busy ? <StatusSpinner /> : null}
            {busy ? "Syncing…" : "Sync now"}
          </Button>
        }
        description={
          lastSyncedAt
            ? "Search Console returned no queries for this property. Sync again after the site has search traffic."
            : "Sync this property to pull the queries you rank for and the prompt suggestions they turn into."
        }
        preview={
          <EmptyStateTablePreview
            columns={EMPTY_STATE_TABLE_COLUMNS.searchConsole}
            rows={EMPTY_STATE_TABLE_ROWS}
          />
        }
        title={lastSyncedAt ? "No queries in this sync" : "No sync yet"}
      />
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Last sync</h2>
        <Button disabled={busy} onClick={onSync} size="sm" variant="outline">
          {busy ? <StatusSpinner /> : null}
          {busy ? "Syncing…" : "Sync now"}
        </Button>
      </div>
      <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-5">
        {stats.map((stat) => (
          <div className="bg-background px-4 py-3" key={stat.label}>
            <p className="text-muted-foreground text-xs">{stat.label}</p>
            <p className="mt-1 text-lg font-medium tabular-nums">
              {loading ? "—" : stat.value}
            </p>
          </div>
        ))}
      </div>
      {queries.length > 0 ? (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Query</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Position</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleQueries.map((query) => (
                <TableRow key={query.query}>
                  <TableCell className="max-w-64">
                    <span className="block truncate font-medium">
                      {query.query}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="tabular-nums">
                      {formatCount(query.clicks)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="tabular-nums">
                      {formatCount(query.impressions)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="tabular-nums">
                      {query.position.toFixed(1)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {queries.length > VISIBLE_QUERIES ? (
            <p className="text-muted-foreground border-t px-3 py-2 text-xs">
              Showing {VISIBLE_QUERIES} of {formatCount(queries.length)} queries
            </p>
          ) : null}
        </div>
      ) : null}
      {loading || added.length === 0 ? null : (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="text-sm font-medium">Added</h3>
            <Link
              className="text-muted-foreground text-sm underline underline-offset-4"
              href={`/${organizationSlug}/geo/prompts`}
            >
              Prompts
            </Link>
          </div>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prompt suggestion</TableHead>
                  <TableHead>From query</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleSuggestions.map((suggestion) => (
                  <TableRow key={suggestion.id}>
                    <TableCell className="max-w-80">
                      <span className="block truncate">
                        {suggestion.prompt}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-48">
                      <span className="text-muted-foreground block truncate">
                        {suggestion.keywords[0]?.query ?? "—"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </section>
  );
}

function GoogleSearchConsoleIntegrationCard({
  callbackPath,
  onReconnect,
  organizationId,
  organizationSlug,
  status,
}: GoogleSearchConsoleIntegrationCardProps) {
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const sync = useGscSync(organizationId);
  const disconnect = useGscDisconnect(organizationId);
  const busy = sync.isPending || disconnect.isPending;
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
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Badge variant={needsReconnect ? "secondary" : "default"}>
                {connectionLabel(status)}
              </Badge>
              {needsReconnect ? (
                <Button onClick={onReconnect} size="sm">
                  Reconnect
                </Button>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button disabled={busy} size="icon-sm" variant="ghost">
                      <svg
                        aria-label="More options"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <title>More options</title>
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="12" cy="5" r="1" />
                        <circle cx="12" cy="19" r="1" />
                      </svg>
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  {hasProperty ? (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => setPropertyDialogOpen(true)}
                    >
                      Change property
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => disconnect.mutate()}
                    variant="destructive"
                  >
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
          heading={title}
          icon={<Google />}
        >
          <div className="space-y-4">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="min-w-0">
                <dt className="text-muted-foreground text-xs">Account</dt>
                <dd className="mt-1 truncate text-sm font-medium">
                  {status.email ?? "Google account"}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground text-xs">Last sync</dt>
                <dd className="mt-1 truncate text-sm font-medium">
                  {status.lastSyncedAt
                    ? formatRelative(status.lastSyncedAt)
                    : "Not yet"}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground text-xs">Schedule</dt>
                <dd className="mt-1 truncate text-sm font-medium">
                  {status.weeklySyncScheduled ? "Weekly" : "Manual"}
                </dd>
              </div>
            </dl>
            {needsReconnect ? (
              <p className="text-muted-foreground text-sm">
                Google access expired. Reconnect to keep syncing.
              </p>
            ) : null}
            {status.lastError ? (
              <p className="text-destructive text-sm text-pretty">
                {status.lastError}
              </p>
            ) : null}
            {!needsReconnect && !status.siteUrl && status.sites.length > 0 ? (
              <SearchConsolePropertyPicker
                organizationId={organizationId}
                sites={status.sites}
                websiteUrl={null}
              />
            ) : null}
            {!needsReconnect &&
            !status.siteUrl &&
            status.sites.length === 0 &&
            !status.lastError ? (
              <p className="text-muted-foreground text-sm">
                No properties were found for this Google account.
              </p>
            ) : null}
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

export default function PageClient({
  organizationSlug,
}: GoogleSearchConsolePageClientProps) {
  const { getOrganization } = useOrganizationsContext();
  const organization = getOrganization(organizationSlug);
  const pathname = usePathname();
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
  const authorizeUrl = `${GSC_OAUTH_AUTHORIZE_PATH}?${new URLSearchParams({
    organizationId,
    callbackPath: pathname,
  }).toString()}`;

  useHotkey("C", () => setDialogOpen(true), {
    enabled: canConnect && !dialogOpen,
  });

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Google Search Console
            </h1>
            <p className="text-muted-foreground">
              Turn the search queries you already rank for into AI prompt
              suggestions
            </p>
          </div>
          {canConnect ? (
            <Button className="gap-1.5" onClick={() => setDialogOpen(true)}>
              <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
              {needsReconnect ? "Reconnect" : "Connect Search Console"}
              <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
            </Button>
          ) : null}
        </div>

        <div>
          {showLoading ? <GoogleSearchConsolePageSkeleton /> : null}

          {showError ? (
            <EmptyState
              action={
                <Button onClick={() => refetch()} size="sm" variant="outline">
                  Retry
                </Button>
              }
              description="Something went wrong while loading Google Search Console."
              title="Failed to load integration"
            />
          ) : null}

          {!(showLoading || showError || status?.connected) ? (
            <EmptyState
              action={
                status?.configured === false ? null : (
                  <Button
                    onClick={() => setDialogOpen(true)}
                    size="sm"
                    variant="outline"
                  >
                    Connect Search Console
                  </Button>
                )
              }
              description={
                status?.configured === false
                  ? GSC_ERROR_MESSAGES.gsc_not_configured
                  : "Connect Google Search Console to suggest prompts from the queries you already rank for."
              }
              preview={
                <EmptyStateCardsPreview count={2} variant="integration" />
              }
              title="No integration yet"
            />
          ) : null}

          {!showLoading && status?.connected ? (
            <div className="grid gap-4">
              <GoogleSearchConsoleIntegrationCard
                callbackPath={pathname}
                onReconnect={() => setDialogOpen(true)}
                organizationId={organizationId}
                organizationSlug={organizationSlug}
                status={status}
              />
            </div>
          ) : null}
        </div>
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
