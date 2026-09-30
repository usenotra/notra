"use client";

import {
  ArrowRight02Icon,
  MoreHorizontalIcon,
  SearchIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GSC_OAUTH_AUTHORIZE_PATH } from "@notra/geo-core/constants/google-search-console";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
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
import { Label } from "@notra/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { Google } from "@notra/ui/components/ui/svgs/google";
import { useLocale, useTranslations } from "next-intl";
import { type MouseEvent, type ReactNode, useId, useState } from "react";

import { Button } from "@/components/button";
import { ProjectLogo } from "@/components/geo/project-logo";
import { StatusSpinner } from "@/components/geo/status-spinner";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { GSC_SETUP_EXAMPLES } from "@/constants/geo-prompts";
import { flushTrackEvent } from "@/lib/analytics/posthog-client";
import { useBrandSettings } from "@/lib/hooks/use-brand-analysis";
import { useFormatRelative } from "@/lib/hooks/use-format-relative";
import {
  useGscDisconnect,
  useGscSelectSite,
  useGscSites,
  useGscSync,
} from "@/lib/hooks/use-geo";
import { useGeoProjectsDb } from "@/lib/hooks/use-geo-db";
import { cn } from "@/lib/utils";
import type {
  SearchConsoleConnectedStateProps,
  SearchConsolePropertyPickerProps,
  SearchConsoleReconnectButtonProps,
  SearchConsoleSetupStateProps,
  SearchConsoleToolbarProps,
} from "@/types/components/geo";
import { formatCount } from "@/utils/format";
import {
  findMatchingGscSiteUrl,
  formatGscSiteUrl,
  getGscSiteDomain,
  isSearchConsoleSynced,
} from "@/utils/gsc-site-url";
import { handleTrackedAnchorClick } from "@/utils/tracked-anchor-click";

function buildAuthorizeUrl(organizationId: string, callbackPath: string) {
  const params = new URLSearchParams({ organizationId, callbackPath });
  return `${GSC_OAUTH_AUTHORIZE_PATH}?${params.toString()}`;
}

function onConnectClick(
  event: MouseEvent<HTMLAnchorElement>,
  isReconnect: boolean
) {
  handleTrackedAnchorClick(event, () =>
    flushTrackEvent(POSTHOG_EVENTS.GSC_CONNECT_STARTED, {
      is_reconnect: isReconnect,
    })
  );
}

export function SearchConsolePropertyPicker({
  organizationId,
  sites,
  websiteUrl,
  onSelected,
}: SearchConsolePropertyPickerProps) {
  const t = useTranslations("geo.searchConsoleCard");
  const tCommon = useTranslations("common");
  const id = useId();
  const [selectedSiteUrl, setSelectedSiteUrl] = useState<string | null>(null);
  const selectSite = useGscSelectSite(organizationId);
  const siteUrl =
    selectedSiteUrl ?? findMatchingGscSiteUrl(sites, websiteUrl) ?? "";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${id}-site`}>{t("property")}</Label>
        <Select
          onValueChange={(value) => setSelectedSiteUrl(value ?? "")}
          value={siteUrl}
        >
          <SelectTrigger className="w-full" id={`${id}-site`}>
            <SelectValue placeholder={t("selectProperty")}>
              {(value: string | null) => {
                if (!value) {
                  return t("selectProperty");
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
          // Progress and the result are reported by toasts, so the caller can
          // close its dialog instead of blocking on the first sync.
          selectSite.mutate({ siteUrl });
          onSelected?.();
        }}
      >
        {selectSite.isPending ? <StatusSpinner /> : null}
        {selectSite.isPending
          ? tCommon("labels.connecting")
          : t("connectProperty")}
      </Button>
    </div>
  );
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
  const t = useTranslations("geo.searchConsoleCard");
  const tCommon = useTranslations("common");
  const formatRelative = useFormatRelative();
  const syncedLabel = status.lastSyncedAt
    ? t("lastSynced", { when: formatRelative(status.lastSyncedAt) })
    : t("notSynced");
  const connectedMeta = status.email
    ? `${status.email} · ${syncedLabel}`
    : syncedLabel;
  const sync = useGscSync(organizationId);
  const sites = useGscSites(organizationId, propertyPickerOpen);
  const disconnect = useGscDisconnect(organizationId);
  const busy = sync.isPending || disconnect.isPending;

  let changeDialogBody: ReactNode;
  if (sites.isPending) {
    changeDialogBody = (
      <div className="text-muted-foreground flex items-center gap-2 px-4 py-3 text-sm md:px-0">
        <StatusSpinner />
        {tCommon("labels.loadingProperties")}
      </div>
    );
  } else if (sites.data?.sites.length) {
    changeDialogBody = (
      <div className="px-4 md:px-0">
        <SearchConsolePropertyPicker
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
            ? tCommon("messages.searchConsolePropertiesCouldNot")
            : tCommon("messages.noPropertiesWereFoundFor")}
        </p>
        <Button
          className="w-full"
          nativeButton={false}
          render={
            <a
              href={buildAuthorizeUrl(organizationId, callbackPath)}
              onClick={(event) => onConnectClick(event, true)}
            >
              {tCommon("labels.reconnectGoogle")}
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
        className="flex flex-wrap items-center justify-between gap-3"
        role="region"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="bg-background flex size-9 shrink-0 items-center justify-center rounded-lg border shadow-2xs"
          >
            <Google className="size-4.5" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium">
              <span className="truncate">
                {formatGscSiteUrl(status.siteUrl ?? "")}
              </span>
              {status.weeklySyncScheduled ? (
                <Badge className="font-normal" variant="secondary">
                  {t("weeklySync")}
                </Badge>
              ) : null}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {connectedMeta}
            </p>
            {status.lastError ? (
              <p className="text-destructive text-xs text-pretty">
                {status.lastError}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {action}
          <Button
            disabled={busy}
            onClick={() => sync.mutate()}
            size="sm"
            variant="outline"
          >
            {sync.isPending ? <StatusSpinner /> : null}
            {sync.isPending
              ? tCommon("labels.syncing")
              : tCommon("labels.syncNow")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  aria-label={t("actions")}
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
                {tCommon("labels.changeProperty")}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={busy}
                onClick={() => disconnect.mutate()}
                variant="destructive"
              >
                {tCommon("actions.disconnect")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <ResponsiveDialog
        onOpenChange={onPropertyPickerOpenChange}
        open={propertyPickerOpen}
      >
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {tCommon("labels.changeSearchConsoleProperty")}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {tCommon("messages.yourCurrentPropertyStaysConnected")}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          {changeDialogBody}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}

function SetupExamplesPreview() {
  const t = useTranslations("geo.searchConsoleCard.examples");
  const locale = useLocale();
  return (
    <ul className="bg-card divide-border/60 mx-auto w-full max-w-2xl divide-y overflow-hidden rounded-xl border text-left shadow-2xs">
      {GSC_SETUP_EXAMPLES.map((example) => (
        <li
          className="grid grid-cols-[minmax(0,11rem)_auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
          key={example.key}
        >
          <span className="text-muted-foreground bg-muted/60 inline-flex max-w-full min-w-0 items-center gap-1.5 justify-self-start rounded-md px-2 py-1 text-xs">
            <HugeiconsIcon className="shrink-0" icon={SearchIcon} size={12} />
            <span className="truncate">{t(`${example.key}.query`)}</span>
          </span>
          <HugeiconsIcon
            className="text-muted-foreground/60"
            icon={ArrowRight02Icon}
            size={14}
          />
          <span className="truncate text-sm font-medium">
            {t(`${example.key}.prompt`)}
          </span>
          <span className="text-muted-foreground text-xs tabular-nums">
            {formatCount(example.impressions, locale)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ReconnectButton({
  organizationId,
  callbackPath,
  label,
  variant = "outline",
}: SearchConsoleReconnectButtonProps) {
  return (
    <Button
      nativeButton={false}
      render={
        <a
          href={buildAuthorizeUrl(organizationId, callbackPath)}
          onClick={(event) => onConnectClick(event, true)}
        >
          <Google className="size-4" />
          {label}
        </a>
      }
      variant={variant}
    />
  );
}

/** Empty state for every Search Console step before a property is synced. */
function SetupState({
  organizationId,
  callbackPath,
  status,
  websiteUrl,
}: SearchConsoleSetupStateProps) {
  const t = useTranslations("geo.searchConsoleCard");
  const tCommon = useTranslations("common");
  const tIntegrations = useTranslations("integrations.shared");
  const reauth = status.status === "reauth_required";
  const connected = status.connected && !reauth;

  let title = t("setupTitle");
  let description: ReactNode = t("setupDescription");
  let action: ReactNode = null;

  if (!status.configured) {
    description = tIntegrations("googleSearchConsoleIsNot");
  } else if (reauth) {
    title = t("reauthTitle");
    description = t("reauthRequired");
    action = (
      <ReconnectButton
        callbackPath={callbackPath}
        label={tCommon("labels.reconnectGoogle")}
        organizationId={organizationId}
        variant="default"
      />
    );
  } else if (!connected) {
    action = (
      <Button
        nativeButton={false}
        render={
          <a
            href={buildAuthorizeUrl(organizationId, callbackPath)}
            onClick={(event) => onConnectClick(event, false)}
          >
            <Google className="size-4" />
            {tCommon("labels.connectSearchConsole")}
          </a>
        }
      />
    );
  } else if (status.sites.length > 0) {
    title = t("choosePropertyTitle");
    description = status.lastError ? (
      <span className="text-destructive">{status.lastError}</span>
    ) : (
      t("choosePropertyDescription")
    );
    action = (
      <div className="bg-card w-full max-w-sm rounded-xl border p-4 text-left shadow-2xs">
        <SearchConsolePropertyPicker
          organizationId={organizationId}
          sites={status.sites}
          websiteUrl={websiteUrl}
        />
      </div>
    );
  } else {
    title = t("choosePropertyTitle");
    description = status.lastError ?? t("noPropertiesReconnect");
    action = (
      <ReconnectButton
        callbackPath={callbackPath}
        label={tCommon("labels.reconnectGoogle")}
        organizationId={organizationId}
      />
    );
  }

  return (
    <div className="bg-muted/15 flex flex-col items-center gap-8 rounded-2xl border px-6 py-12 text-center">
      <div className="flex max-w-md flex-col items-center">
        <span
          aria-hidden="true"
          className="bg-background mb-4 flex size-11 items-center justify-center rounded-xl border shadow-xs"
        >
          <Google className="size-5.5" />
        </span>
        <h3 className="text-lg font-semibold text-balance">{title}</h3>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed text-pretty">
          {description}
        </p>
        {action ? (
          <div className="mt-5 flex w-full justify-center">{action}</div>
        ) : null}
      </div>
      {status.connected ? null : <SetupExamplesPreview />}
    </div>
  );
}

export function SearchConsoleToolbar({
  action,
  organizationId,
  callbackPath,
  isPending,
  onPropertyPickerOpenChange,
  propertyPickerOpen,
  status,
}: SearchConsoleToolbarProps) {
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

  if (isPending || !status) {
    return (
      <div aria-busy="true" className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
    );
  }

  if (isSearchConsoleSynced(status)) {
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

  const setup = (
    <SetupState
      callbackPath={callbackPath}
      organizationId={organizationId}
      status={status}
      websiteUrl={websiteUrl}
    />
  );
  // Suggestions from an earlier sync stay actionable while Google is disconnected.
  if (!action) {
    return setup;
  }
  return (
    <div className="space-y-3">
      <div className="flex justify-end">{action}</div>
      {setup}
    </div>
  );
}
