"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useLocale, useTranslations } from "next-intl";

import { Table, type TableColumn } from "@/components/motion/table";
import { SITE_PROPERTY_ROW_HEIGHT } from "@/constants/sites";
import type {
  SiteDeploymentPropertyRow,
  SiteDeploymentRecord,
} from "@/types/sites";
import { formatBytes } from "@/utils/format";
import { displayUrl } from "@/utils/site-links";
import { paginatedTableHeightFor } from "@/utils/table";

function UrlValue({ url, live }: { url: string; live: boolean }) {
  const t = useTranslations("sites.deploymentPage");
  if (!live) {
    return (
      <span className="flex min-w-0 items-center gap-2">
        <span className="text-muted-foreground truncate" title={url}>
          {displayUrl(url)}
        </span>
        <span className="text-muted-foreground shrink-0 text-xs">
          {t("notLive")}
        </span>
      </span>
    );
  }
  return (
    <a
      className="group inline-flex min-w-0 items-center gap-1"
      href={url}
      rel="noopener noreferrer"
      target="_blank"
      title={url}
    >
      <span className="truncate underline-offset-4 group-hover:underline">
        {displayUrl(url)}
      </span>
      <HugeiconsIcon
        aria-hidden="true"
        className="text-muted-foreground size-3.5 shrink-0"
        icon={ArrowUpRight01Icon}
        strokeWidth={1.5}
      />
    </a>
  );
}

/**
 * A deployment's facts as a compact property list in the house table:
 * where it runs, where it answers, what it produced and when it started.
 */
export function SiteDeploymentProperties({
  deployment,
  live,
  urls,
}: {
  deployment: SiteDeploymentRecord;
  live: boolean;
  urls: string[];
}) {
  const t = useTranslations("sites.deploymentPage");
  const tKinds = useTranslations("sites.kinds");
  const locale = useLocale();
  const created = new Date(deployment.createdAt);

  let environment = tKinds(deployment.kind);
  if (deployment.previewKey) {
    environment = `${environment} · ${deployment.previewKey}`;
  }
  if (live) {
    environment = `${environment} · ${t("current")}`;
  }

  const output =
    deployment.fileCount === null
      ? null
      : [
          t("output.fileCount", { count: deployment.fileCount }),
          deployment.totalBytes === null
            ? null
            : formatBytes(deployment.totalBytes, locale),
        ]
          .filter(Boolean)
          .join(" · ");

  const rows: SiteDeploymentPropertyRow[] = [
    { key: "environment", label: t("fields.environment"), value: environment },
    ...urls.map((url, index) => ({
      key: `domain-${url}`,
      label: index === 0 ? t("fields.domains") : "",
      value: <UrlValue live={live} url={url} />,
    })),
    {
      key: "output",
      label: t("output.title"),
      value: output ?? <span className="text-muted-foreground">-</span>,
    },
    {
      key: "toolchain",
      label: t("output.toolchain"),
      value: deployment.toolchainVersion ? (
        <span className="font-mono text-xs">{deployment.toolchainVersion}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
    },
    {
      key: "created",
      label: t("fields.created"),
      value: (
        <time className="tabular-nums" dateTime={created.toISOString()}>
          {created.toLocaleString(locale, {
            dateStyle: "medium",
            timeStyle: "medium",
          })}
        </time>
      ),
    },
  ];

  const columns: TableColumn<SiteDeploymentPropertyRow>[] = [
    {
      key: "label",
      header: t("fields.property"),
      width: "9rem",
      cell: (row) => <span className="text-muted-foreground">{row.label}</span>,
    },
    {
      key: "value",
      header: t("fields.value"),
      width: "1fr",
      cell: (row) => (
        <span className="flex min-w-0 items-center">{row.value}</span>
      ),
    },
  ];

  return (
    <Table
      className="rounded-2xl"
      columns={columns}
      data={rows}
      getRowId={(row) => row.key}
      height={paginatedTableHeightFor(rows.length, SITE_PROPERTY_ROW_HEIGHT)}
      rowHeight={SITE_PROPERTY_ROW_HEIGHT}
      scrollFade={false}
    />
  );
}
