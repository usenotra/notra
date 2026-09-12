"use client";

import { Cancel01Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GSC_OAUTH_AUTHORIZE_PATH } from "@notra/geo-core/constants/google-search-console";
import type { GeoSearchConsoleStatus } from "@notra/geo-core/types/google-search-console";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@notra/ui/components/shared/responsive-dialog";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Label } from "@notra/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { Google } from "@notra/ui/components/ui/svgs/google";
import { type ReactNode, useId, useState } from "react";

import { Button } from "@/components/button";
import { ProjectLogo } from "@/components/geo/project-logo";
import { StatusSpinner } from "@/components/geo/status-spinner";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { useBrandSettings } from "@/lib/hooks/use-brand-analysis";
import {
  useGscDisconnect,
  useGscSelectSite,
  useGscSites,
  useGscSync,
} from "@/lib/hooks/use-geo";
import { useGeoProjectsDb } from "@/lib/hooks/use-geo-db";
import { cn } from "@/lib/utils";
import type {
  SearchConsoleConnectActionProps,
  SearchConsoleConnectedStateProps,
  SearchConsoleHeaderRowProps,
  SearchConsolePropertyPickerProps,
  SearchConsoleSelectSiteStateProps,
  SearchConsoleToolbarProps,
} from "@/types/components/geo";
import { formatRelative } from "@/utils/format-relative";
import {
  findMatchingGscSiteUrl,
  formatGscSiteUrl,
  getGscSiteDomain,
} from "@/utils/gsc-site-url";

function buildAuthorizeUrl(organizationId: string, callbackPath: string) {
  const params = new URLSearchParams({ organizationId, callbackPath });
  return `${GSC_OAUTH_AUTHORIZE_PATH}?${params.toString()}`;
}

function trackConnectStarted(isReconnect: boolean) {
  trackEvent(POSTHOG_EVENTS.GSC_CONNECT_STARTED, { is_reconnect: isReconnect });
}

function HeaderRow({
  action,
  titleId,
  onDismiss,
}: SearchConsoleHeaderRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="shrink-0">
        <span className="inline-flex size-5 items-center justify-center">
          <Google className="size-4" />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-medium" id={titleId}>
          Google Search Console
        </p>
        <p className="text-muted-foreground text-sm leading-snug">
          We read the queries your site ranks for and suggest the AI prompts
          people ask. Suggestions refresh weekly.
        </p>
      </div>
      {action || onDismiss ? (
        <div className="flex shrink-0 items-center gap-1">
          {action}
          {onDismiss ? (
            <Button
              aria-label="Dismiss Search Console card"
              className="text-muted-foreground"
              onClick={onDismiss}
              size="icon-sm"
              variant="ghost"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={14} />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ConnectAction({
  organizationId,
  callbackPath,
  configured,
  reauth,
}: SearchConsoleConnectActionProps) {
  if (!configured) {
    return (
      <p className="text-muted-foreground max-w-40 text-xs">
        Not available on this workspace yet.
      </p>
    );
  }

  return (
    <Button
      className="shrink-0"
      nativeButton={false}
      render={
        <a
          href={buildAuthorizeUrl(organizationId, callbackPath)}
          onClick={() => trackConnectStarted(reauth)}
        >
          {reauth ? "Reconnect Google" : "Connect Search Console"}
        </a>
      }
      size="sm"
      variant={reauth ? "default" : "outline"}
    />
  );
}

function PropertyPicker({
  organizationId,
  sites,
  websiteUrl,
  onSelected,
}: SearchConsolePropertyPickerProps) {
  const id = useId();
  const [selectedSiteUrl, setSelectedSiteUrl] = useState<string | null>(null);
  const selectSite = useGscSelectSite(organizationId);
  const siteUrl =
    selectedSiteUrl ?? findMatchingGscSiteUrl(sites, websiteUrl) ?? "";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${id}-site`}>Property</Label>
        <Select
          onValueChange={(value) => setSelectedSiteUrl(value ?? "")}
          value={siteUrl}
        >
          <SelectTrigger className="w-full" id={`${id}-site`}>
            <SelectValue placeholder="Select a property">
              {(value: string | null) => {
                if (!value) {
                  return "Select a property";
                }
                const label = formatGscSiteUrl(value);
                return (
                  <>
                    <span
                      aria-hidden="true"
                      className="flex shrink-0 items-center"
                    >
                      <ProjectLogo
                        domain={getGscSiteDomain(value)}
                        name={label}
                      />
                    </span>
                    <span className="truncate">{label}</span>
                  </>
                );
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            {sites.map((site) => {
              const label = formatGscSiteUrl(site.siteUrl);
              return (
                <SelectItem key={site.siteUrl} value={site.siteUrl}>
                  <span
                    aria-hidden="true"
                    className="flex shrink-0 items-center"
                  >
                    <ProjectLogo
                      domain={getGscSiteDomain(site.siteUrl)}
                      name={label}
                    />
                  </span>
                  <span>{label}</span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <Button
        aria-busy={selectSite.isPending}
        className={cn("w-full", selectSite.isPending && "disabled:opacity-100")}
        disabled={siteUrl.length === 0 || selectSite.isPending}
        onClick={() => {
          void selectSite
            .mutateAsync({ siteUrl })
            .then(() => onSelected?.())
            .catch(() => undefined);
        }}
      >
        {selectSite.isPending ? <StatusSpinner /> : null}
        {selectSite.isPending ? "Connecting…" : "Connect property"}
      </Button>
    </div>
  );
}

function SelectSiteState({
  organizationId,
  callbackPath,
  onOpenChange,
  open,
  status,
  websiteUrl,
}: SearchConsoleSelectSiteStateProps) {
  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <div className="flex flex-col items-start gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          {status.lastError ??
            "Choose which Search Console property Notra should analyze."}
        </p>
        <ResponsiveDialogTrigger
          className="shrink-0"
          render={<Button size="sm" variant="outline" />}
        >
          Choose property
        </ResponsiveDialogTrigger>
      </div>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            Choose a Search Console property
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Select the domain whose search queries Notra should use for prompt
            suggestions.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {status.sites.length > 0 ? (
          <div className="px-4 md:px-0">
            <PropertyPicker
              onSelected={() => onOpenChange(false)}
              organizationId={organizationId}
              sites={status.sites}
              websiteUrl={websiteUrl}
            />
          </div>
        ) : (
          <div className="space-y-4 px-4 md:px-0">
            <p className="text-muted-foreground text-sm">
              {status.lastError ??
                "No properties were found for this Google account. Add or verify a property in Search Console, then reconnect."}
            </p>
            <Button
              className="w-full"
              nativeButton={false}
              render={
                <a
                  href={buildAuthorizeUrl(organizationId, callbackPath)}
                  onClick={() => trackConnectStarted(true)}
                >
                  Reconnect Google
                </a>
              }
              variant="outline"
            />
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function connectedMeta(status: GeoSearchConsoleStatus): string {
  const parts: string[] = [];
  if (status.email) {
    parts.push(status.email);
  }
  parts.push(
    status.lastSyncedAt
      ? `Last synced ${formatRelative(status.lastSyncedAt)}`
      : "Not synced yet"
  );
  if (status.lastError) {
    parts.push(status.lastError);
  }
  return parts.join(" · ");
}

function ConnectedState({
  action,
  organizationId,
  callbackPath,
  onPropertyPickerOpenChange,
  propertyPickerOpen,
  status,
  websiteUrl,
}: SearchConsoleConnectedStateProps) {
  const sync = useGscSync(organizationId);
  const sites = useGscSites(organizationId, propertyPickerOpen);
  const disconnect = useGscDisconnect(organizationId);
  const busy = sync.isPending || disconnect.isPending;

  let changeDialogBody: ReactNode;
  if (sites.isPending) {
    changeDialogBody = (
      <div className="text-muted-foreground flex items-center gap-2 px-4 py-3 text-sm md:px-0">
        <StatusSpinner />
        Loading properties…
      </div>
    );
  } else if (sites.data?.sites.length) {
    changeDialogBody = (
      <div className="px-4 md:px-0">
        <PropertyPicker
          onSelected={() => onPropertyPickerOpenChange(false)}
          organizationId={organizationId}
          sites={sites.data.sites}
          websiteUrl={websiteUrl}
        />
      </div>
    );
  } else {
    changeDialogBody = (
      <div className="space-y-4 px-4 md:px-0">
        <p className="text-muted-foreground text-sm">
          {sites.isError
            ? "Search Console properties could not be loaded. Reconnect Google and try again."
            : "No properties were found for this Google account."}
        </p>
        <Button
          className="w-full"
          nativeButton={false}
          render={
            <a
              href={buildAuthorizeUrl(organizationId, callbackPath)}
              onClick={() => trackConnectStarted(true)}
            >
              Reconnect Google
            </a>
          }
          variant="outline"
        />
      </div>
    );
  }

  return (
    <>
      <div
        aria-label="Google Search Console"
        className="flex flex-wrap items-center gap-3 px-4 py-3"
        role="region"
      >
        <span className="inline-flex size-5 shrink-0 items-center justify-center">
          <Google className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm leading-snug font-medium">
              Google Search Console
            </p>
            <span className="text-muted-foreground text-xs" aria-hidden>
              ·
            </span>
            <p className="text-muted-foreground truncate text-sm leading-snug">
              {formatGscSiteUrl(status.siteUrl ?? "")}
            </p>
            {status.weeklySyncScheduled ? (
              <Badge className="font-normal" variant="secondary">
                Weekly sync
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-xs leading-snug">
            {connectedMeta(status)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  aria-label="Search Console actions"
                  disabled={busy}
                  size="icon-sm"
                  variant="ghost"
                >
                  <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                disabled={busy}
                onClick={() => onPropertyPickerOpenChange(true)}
              >
                Change property
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={busy}
                onClick={() => disconnect.mutate()}
                variant="destructive"
              >
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            disabled={busy}
            onClick={() => sync.mutate()}
            size="sm"
            variant="outline"
          >
            {sync.isPending ? <StatusSpinner /> : null}
            {sync.isPending ? "Syncing…" : "Sync now"}
          </Button>
          {action}
        </div>
      </div>
      <ResponsiveDialog
        onOpenChange={onPropertyPickerOpenChange}
        open={propertyPickerOpen}
      >
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              Change Search Console property
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Your current property stays connected until you confirm a new one.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          {changeDialogBody}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}

export function SearchConsoleToolbar({
  action,
  organizationId,
  callbackPath,
  isPending,
  onDismiss,
  onPropertyPickerOpenChange,
  propertyPickerOpen,
  status,
}: SearchConsoleToolbarProps) {
  const headingId = useId();
  const { projectId } = useGeoProjectScope();
  const { projects } = useGeoProjectsDb(organizationId);
  const { data: brandData } = useBrandSettings(organizationId);
  const activeProject =
    projects.find((project) => project.id === projectId) ??
    projects.at(0) ??
    null;
  const websiteUrl =
    brandData?.voices.find(
      (voice) => voice.id === activeProject?.brandSettingsId
    )?.websiteUrl ?? null;

  if (
    !isPending &&
    status?.connected &&
    status.status === "active" &&
    status.siteUrl
  ) {
    return (
      <ConnectedState
        action={action}
        callbackPath={callbackPath}
        onPropertyPickerOpenChange={onPropertyPickerOpenChange}
        organizationId={organizationId}
        propertyPickerOpen={propertyPickerOpen}
        status={status}
        websiteUrl={websiteUrl}
      />
    );
  }

  let body: ReactNode = null;
  let headerAction = action;

  if (isPending || !status) {
    body = (
      <div className="text-muted-foreground flex items-center gap-2 px-4 py-3 text-sm">
        <StatusSpinner />
        Loading…
      </div>
    );
  } else if (!status.connected || status.status === "reauth_required") {
    const connectAction = (
      <ConnectAction
        callbackPath={callbackPath}
        configured={status.configured}
        organizationId={organizationId}
        reauth={status.status === "reauth_required"}
      />
    );
    headerAction = action ? (
      <div className="flex items-center gap-2">
        {connectAction}
        {action}
      </div>
    ) : (
      connectAction
    );
    if (status.status === "reauth_required") {
      body = (
        <p className="text-muted-foreground px-4 py-3 text-sm">
          Google access expired. Reconnect to keep syncing keyword suggestions.
        </p>
      );
    }
  } else {
    body = (
      <SelectSiteState
        callbackPath={callbackPath}
        onOpenChange={onPropertyPickerOpenChange}
        open={propertyPickerOpen}
        organizationId={organizationId}
        status={status}
        websiteUrl={websiteUrl}
      />
    );
  }

  return (
    <div aria-busy={isPending} aria-labelledby={headingId} role="region">
      <HeaderRow
        action={headerAction}
        onDismiss={onDismiss}
        titleId={headingId}
      />
      {body ? (
        <>
          <div className="border-border/80 mx-4 border-t" />
          {body}
        </>
      ) : null}
    </div>
  );
}
