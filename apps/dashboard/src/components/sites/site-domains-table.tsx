"use client";

import {
  Alert02Icon,
  ArrowDown01Icon,
  ArrowUpRight01Icon,
  Delete02Icon,
  Link04Icon,
  MoreHorizontalIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/button";
import { Table, type TableColumn } from "@/components/motion/table";
import {
  SiteDnsRecordsTable,
  SiteDnsSetup,
} from "@/components/sites/site-domain-dns";
import { SiteProxySetup } from "@/components/sites/site-domain-proxy";
import { SiteRelativeTime } from "@/components/sites/site-relative-time";
import { SITE_DOMAIN_STATUS_DOTS } from "@/constants/sites";
import { useSiteDomainCheck } from "@/lib/hooks/use-site-domain-check";
import { cn } from "@/lib/utils";
import type {
  SiteDomain,
  SiteDomainChipStatus,
  SiteDomainRow,
  SiteDomainSetupProps,
  SiteMounts,
  SiteScope,
} from "@/types/sites";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";
import { displayUrl } from "@/utils/site-links";
import { mountedPaths } from "@/utils/site-proxy-recipes";
import { tableHeightFor } from "@/utils/table";

function domainStatus(domain: SiteDomain): SiteDomainChipStatus {
  if (domain.status === "pending") {
    return domain.kind === "proxy" ? "proxyRequired" : "dnsRequired";
  }
  return domain.status;
}

function domainUrl(domain: SiteDomain, mounts: SiteMounts): string {
  const firstPath = mountedPaths(mounts)[0];
  const path = domain.kind === "proxy" && firstPath !== "/" ? firstPath : "";
  return `https://${domain.hostname}${path ?? ""}`;
}

function StatusDot({ status }: { status: SiteDomainChipStatus }) {
  const t = useTranslations("sites.domainsPage.status");
  return (
    <span className="inline-flex items-center gap-2 text-sm whitespace-nowrap">
      <span
        aria-hidden="true"
        className={cn(
          "size-2 shrink-0 rounded-full",
          SITE_DOMAIN_STATUS_DOTS[status]
        )}
      />
      <span className="font-medium">{t(status)}</span>
    </span>
  );
}

function CheckButton({
  scope,
  domain,
}: {
  scope: SiteScope;
  domain: SiteDomain;
}) {
  const t = useTranslations("sites.domainsPage");
  const check = useSiteDomainCheck({ ...scope, domainId: domain.id });
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={t("checkLabel", { hostname: domain.hostname })}
            disabled={check.isPending}
            onClick={() => check.mutate()}
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <HugeiconsIcon
          className={cn(
            "size-4",
            check.isPending && "motion-safe:animate-spin"
          )}
          icon={RefreshIcon}
          strokeWidth={1.5}
        />
      </TooltipTrigger>
      <TooltipContent>
        {check.isPending ? t("checking") : t("check")}
      </TooltipContent>
    </Tooltip>
  );
}

function RowMenu({
  hostname,
  url,
  canOpen,
  onRemove,
}: {
  hostname: string;
  url: string;
  canOpen: boolean;
  onRemove?: () => void;
}) {
  const t = useTranslations("sites.domainsPage");
  const tCommon = useTranslations("common");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={t("moreLabel", { hostname })}
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <HugeiconsIcon
          className="size-4"
          icon={MoreHorizontalIcon}
          strokeWidth={1.5}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          disabled={!canOpen}
          onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
        >
          <HugeiconsIcon
            icon={ArrowUpRight01Icon}
            size={14}
            strokeWidth={1.5}
          />
          {t("open")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => copyTextToClipboard(url, tCommon("toasts.copied"))}
        >
          <HugeiconsIcon icon={Link04Icon} size={14} strokeWidth={1.5} />
          {t("copyUrl")}
        </DropdownMenuItem>
        {onRemove ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRemove} variant="destructive">
              <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.5} />
              {t("remove")}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** How to connect a domain, under its row: DNS records or proxy rewrites, then a check. */
function DomainSetup({
  organizationId,
  siteId,
  domain,
  aliasOrigin,
  mounts,
}: SiteDomainSetupProps) {
  const t = useTranslations("sites.domainsPage");
  const check = useSiteDomainCheck({
    organizationId,
    siteId,
    domainId: domain.id,
  });
  const isActive = domain.status === "active";

  let setup = (
    <SiteDnsSetup
      domain={domain}
      organizationId={organizationId}
      siteId={siteId}
    />
  );
  if (domain.kind === "proxy") {
    setup = <SiteProxySetup aliasOrigin={aliasOrigin} mounts={mounts} />;
  } else if (isActive) {
    setup = <SiteDnsRecordsTable records={domain.records} />;
  }

  return (
    <div className="space-y-5 px-4 py-5 sm:ps-6 sm:pe-5">
      {!isActive && domain.lastError ? (
        <div className="flex items-start gap-2 text-sm" role="alert">
          <HugeiconsIcon
            aria-hidden="true"
            className="text-destructive mt-0.5 size-4 shrink-0"
            icon={Alert02Icon}
            strokeWidth={1.5}
          />
          <div className="min-w-0 space-y-0.5">
            <p className="font-medium">
              {domain.lastCheckedAt
                ? t("lastErrorTitle")
                : t("setupErrorTitle")}
            </p>
            <p className="text-muted-foreground break-words">
              {domain.lastError}
            </p>
          </div>
        </div>
      ) : null}
      {setup}
      {isActive ? null : (
        <div className="border-border/60 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm text-pretty">
            {domain.kind === "proxy"
              ? t("verifyProxyHint")
              : t("verifyDnsHint")}
          </p>
          <Button
            className="shrink-0"
            loading={check.isPending}
            onClick={() => check.mutate()}
            size="sm"
            variant="outline"
          >
            <HugeiconsIcon icon={RefreshIcon} strokeWidth={1.5} />
            {t("verifyNow")}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * The Notra address and every custom domain in one house table. A domain
 * that still needs setup opens its DNS records or rewrites under its row;
 * active ones fold them away until clicked.
 */
export function SiteDomainsTable({
  organizationId,
  siteId,
  aliasOrigin,
  mounts,
  domains,
  onRemove,
}: SiteScope & {
  aliasOrigin: string;
  mounts: SiteMounts;
  domains: SiteDomain[];
  onRemove: (domain: SiteDomain) => void;
}) {
  const t = useTranslations("sites.domainsPage");
  const scope = { organizationId, siteId };
  // Rows the reader toggled away from their default (pending open, active closed).
  const [toggled, setToggled] = useState<ReadonlySet<string>>(new Set());
  const rows: SiteDomainRow[] = [
    {
      id: "alias",
      kind: "alias",
      isPrimary: !domains.some((domain) => domain.isPrimary),
    },
    ...domains.map((domain) => ({
      id: domain.id,
      kind: "domain" as const,
      domain,
    })),
  ];

  const isExpanded = (row: SiteDomainRow) => {
    if (row.kind === "alias") {
      return false;
    }
    const open = row.domain.status !== "active";
    return toggled.has(row.id) ? !open : open;
  };

  const toggle = (row: SiteDomainRow) => {
    if (row.kind === "alias") {
      return;
    }
    setToggled((previous) => {
      const next = new Set(previous);
      if (next.has(row.id)) {
        next.delete(row.id);
      } else {
        next.add(row.id);
      }
      return next;
    });
  };

  const columns: TableColumn<SiteDomainRow>[] = [
    {
      key: "domain",
      header: t("columns.domain"),
      width: "1fr",
      minWidth: "9rem",
      cell: (row) => {
        const isAlias = row.kind === "alias";
        const name = isAlias ? displayUrl(aliasOrigin) : row.domain.hostname;
        let detail = t("notraAddress");
        if (!isAlias) {
          detail =
            row.domain.kind === "proxy"
              ? t("kindProxyPaths", { paths: mountedPaths(mounts).join(", ") })
              : t("kinds.subdomain");
        }
        const primary = isAlias ? row.isPrimary : row.domain.isPrimary;
        return (
          <span className="flex min-w-0 flex-col gap-1">
            <span className="truncate font-medium" title={name}>
              {name}
            </span>
            <span className="text-muted-foreground truncate text-xs">
              {primary ? `${detail} · ${t("primary")}` : detail}
            </span>
            {/* Narrow screens drop the status column; keep the status here. */}
            <span className="@min-[30rem]/main:hidden">
              <StatusDot
                status={isAlias ? "active" : domainStatus(row.domain)}
              />
            </span>
          </span>
        );
      },
    },
    {
      key: "status",
      header: t("columns.status"),
      width: "10rem",
      collapsePriority: 2,
      cell: (row) => (
        <span className="flex h-5 items-center">
          <StatusDot
            status={row.kind === "alias" ? "active" : domainStatus(row.domain)}
          />
        </span>
      ),
    },
    {
      key: "checked",
      header: t("columns.checked"),
      width: "9rem",
      align: "right",
      collapsePriority: 1,
      cell: (row) => {
        if (row.kind === "alias") {
          return <span className="text-muted-foreground">-</span>;
        }
        return row.domain.lastCheckedAt ? (
          <SiteRelativeTime
            className="text-muted-foreground whitespace-nowrap"
            date={row.domain.lastCheckedAt}
          />
        ) : (
          <span className="text-muted-foreground whitespace-nowrap">
            {t("notChecked")}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: <span className="sr-only">{t("columns.actions")}</span>,
      width: "6.5rem",
      align: "right",
      cell: (row) => {
        const url =
          row.kind === "alias" ? aliasOrigin : domainUrl(row.domain, mounts);
        const hostname =
          row.kind === "alias" ? displayUrl(aliasOrigin) : row.domain.hostname;
        return (
          // Menu events bubble through the portal to the row; keep them here.
          <span
            className="-my-1 flex items-center justify-end gap-0.5"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {row.kind === "domain" ? (
              <CheckButton domain={row.domain} scope={scope} />
            ) : null}
            <RowMenu
              canOpen={row.kind === "alias" || row.domain.status === "active"}
              hostname={hostname}
              onRemove={
                row.kind === "domain" ? () => onRemove(row.domain) : undefined
              }
              url={url}
            />
            {row.kind === "domain" ? (
              <HugeiconsIcon
                aria-hidden="true"
                className={cn(
                  "text-muted-foreground ms-1 size-4 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none",
                  isExpanded(row) && "rotate-180"
                )}
                icon={ArrowDown01Icon}
                strokeWidth={1.5}
              />
            ) : (
              <span aria-hidden="true" className="ms-1 size-4 shrink-0" />
            )}
          </span>
        );
      },
    },
  ];

  return (
    <Table
      autoHeight
      className="rounded-2xl"
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      height={tableHeightFor(rows.length)}
      isRowClickable={(row) => row.kind === "domain"}
      onRowClick={toggle}
      renderRowDetail={(row) =>
        row.kind === "domain" && isExpanded(row) ? (
          <DomainSetup
            aliasOrigin={aliasOrigin}
            domain={row.domain}
            mounts={mounts}
            organizationId={organizationId}
            siteId={siteId}
          />
        ) : null
      }
      rowSizing="content"
      scrollFade={false}
    />
  );
}
