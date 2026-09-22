"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useHotkey } from "@tanstack/react-hotkeys";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateCardsPreview } from "@/components/empty-state-preview";
import { SearchConsolePropertyPicker } from "@/components/geo/search-console-card";
import { StatusSpinner } from "@/components/geo/status-spinner";
import { AddGoogleSearchConsoleIntegrationDialog } from "@/components/integrations/add-google-search-console-integration-dialog";
import { PageContainer } from "@/components/layout/container";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  useGscDisconnect,
  useGscSites,
  useGscStatus,
  useGscSync,
} from "@/lib/hooks/use-geo";
import { useGscConnectionToast } from "@/lib/hooks/use-gsc-connection-toast";
import { GSC_ERROR_MESSAGES } from "@/lib/integrations/google-search-console/oauth-errors";
import type {
  GoogleSearchConsoleChangePropertyDialogProps,
  GoogleSearchConsoleIntegrationCardProps,
  GoogleSearchConsolePageClientProps,
} from "@/types/integrations/pages";
import { formatRelative } from "@/utils/format-relative";
import { formatGscSiteUrl } from "@/utils/gsc-site-url";

import { GoogleSearchConsolePageSkeleton } from "./skeleton";

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
        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-start sm:justify-between">
          <div className="text-muted-foreground min-w-0 space-y-1">
            <p>
              {status.email ?? "Google account connected"}
              {status.lastSyncedAt
                ? ` · Last synced ${formatRelative(status.lastSyncedAt)}`
                : null}
            </p>
            {status.weeklySyncScheduled ? <p>Weekly sync is on</p> : null}
            {needsReconnect ? (
              <p>
                Google access expired. Reconnect to keep syncing keyword
                suggestions.
              </p>
            ) : null}
            {status.lastError ? (
              <p className="text-destructive text-pretty">{status.lastError}</p>
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
              <p>
                No properties were found for this Google account. Add or verify
                a property in Search Console, then reconnect.
              </p>
            ) : null}
            {hasProperty ? (
              <p>
                Prompt suggestions from this property show up in{" "}
                <Link
                  className="text-foreground underline underline-offset-4"
                  href={`/${organizationSlug}/geo/prompts`}
                >
                  Prompts
                </Link>
                .
              </p>
            ) : null}
          </div>
          {hasProperty ? (
            <Button
              className="shrink-0"
              disabled={busy}
              onClick={() => sync.mutate()}
              size="sm"
              variant="outline"
            >
              {sync.isPending ? <StatusSpinner /> : null}
              {sync.isPending ? "Syncing…" : "Sync now"}
            </Button>
          ) : null}
        </div>
      </TitleCard>
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
