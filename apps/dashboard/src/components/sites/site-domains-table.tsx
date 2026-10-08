"use client";

import {
  ArrowDown01Icon,
  ArrowUpRight01Icon,
  Delete02Icon,
  Link04Icon,
  MoreHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { type ReactNode, useState } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { SiteDomainCheckButton } from "@/components/sites/site-domain-check-button";
import { SiteDomainSetup } from "@/components/sites/site-domain-setup";
import { SiteRelativeTime } from "@/components/sites/site-relative-time";
import { SITE_DOMAIN_STATUS_DOTS } from "@/constants/sites";
import { cn } from "@/lib/utils";
import type {
  SiteDomainRowMenuProps,
  SiteDomainStatusDotProps,
  SiteDomainsTableProps,
} from "@/types/components/sites";
import type { SiteDomainRow } from "@/types/sites";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";
import { siteDomainChipStatus, siteDomainUrl } from "@/utils/site-domains";
import { displayUrl } from "@/utils/site-links";
import { tableHeightFor } from "@/utils/table";

function StatusDot({ status }: SiteDomainStatusDotProps) {
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

function RowMenu({ hostname, url, canOpen, onRemove }: SiteDomainRowMenuProps) {
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

export function SiteDomainsTable({
  organizationId,
  siteId,
  aliasOrigin,
  mounts,
  domains,
  onRemove,
}: SiteDomainsTableProps) {
  const t = useTranslations("sites.domainsPage");
  const scope = { organizationId, siteId };
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  const rowHostname = (row: SiteDomainRow) =>
    row.kind === "alias" ? displayUrl(aliasOrigin) : row.domain.hostname;
  const rowStatus = (row: SiteDomainRow) =>
    row.kind === "alias" ? "active" : siteDomainChipStatus(row.domain);

  const isExpanded = (row: SiteDomainRow) =>
    row.kind === "domain" && row.id === expandedId;

  const toggle = (row: SiteDomainRow) => {
    if (row.kind === "alias") {
      return;
    }
    setExpandedId((previous) => (previous === row.id ? null : row.id));
  };

  const columns: TableColumn<SiteDomainRow>[] = [
    {
      key: "domain",
      header: t("columns.domain"),
      width: "1fr",
      minWidth: "9rem",
      cell: (row) => {
        const isAlias = row.kind === "alias";
        const name = rowHostname(row);
        const primary = isAlias ? row.isPrimary : row.domain.isPrimary;
        return (
          <span className="flex min-h-10 min-w-0 flex-col justify-center gap-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium" title={name}>
                {name}
              </span>
              {primary ? (
                <Badge className="shrink-0" variant="secondary">
                  {t("primary")}
                </Badge>
              ) : null}
            </span>
            <span className="@min-[30rem]/main:hidden">
              <StatusDot status={rowStatus(row)} />
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
        <span className="flex h-10 items-center">
          <StatusDot status={rowStatus(row)} />
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
        let checked: ReactNode = null;
        if (row.kind === "domain") {
          checked = row.domain.lastCheckedAt ? (
            <SiteRelativeTime
              className="whitespace-nowrap"
              date={row.domain.lastCheckedAt}
            />
          ) : (
            <span className="whitespace-nowrap">{t("notChecked")}</span>
          );
        }
        return (
          <span className="text-muted-foreground flex h-10 items-center justify-end">
            {checked}
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
          row.kind === "alias"
            ? aliasOrigin
            : siteDomainUrl(row.domain, mounts);
        return (
          <span
            className="flex h-10 items-center justify-end gap-0.5"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {row.kind === "domain" && !isExpanded(row) ? (
              <SiteDomainCheckButton domain={row.domain} scope={scope} />
            ) : null}
            <RowMenu
              canOpen={row.kind === "alias" || row.domain.status === "active"}
              hostname={rowHostname(row)}
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
    <DataTable
      autoHeight
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      height={tableHeightFor(rows.length)}
      isRowClickable={(row) => row.kind === "domain"}
      onRowClick={toggle}
      renderRowDetail={(row) =>
        row.kind === "domain" && isExpanded(row) ? (
          <SiteDomainSetup
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
