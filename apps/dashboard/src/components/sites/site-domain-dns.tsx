"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cloudflare } from "@notra/ui/components/ui/svgs/cloudflare";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/button";
import { SiteCopyButton } from "@/components/sites/site-copy-button";
import { useSiteDomainConnect } from "@/lib/hooks/use-site-domain-connect";
import type { SiteDnsSetupProps, SiteDomainRecord } from "@/types/sites";

const CLOUDFLARE_PROVIDER = /cloudflare/i;

const RECORD_GRID =
  "grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-4 gap-y-1 sm:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1.3fr)]";

function RecordValue({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="min-w-0 truncate font-mono text-xs" title={value}>
        {value}
      </span>
      <SiteCopyButton label={label} value={value} />
    </span>
  );
}

/**
 * Type | Name | Value with a copy button per value. It lives inside the
 * domains table, so it is a plain grid rather than another framed table.
 */
export function SiteDnsRecordsTable({
  records,
}: {
  records: SiteDomainRecord[];
}) {
  const t = useTranslations("sites.domainsPage.dns");
  if (records.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("noRecords")}</p>;
  }
  return (
    <div className="min-w-0 text-sm" role="table">
      <div
        className={`${RECORD_GRID} text-muted-foreground pb-1.5 text-xs max-sm:hidden`}
        role="row"
      >
        <span role="columnheader">{t("type")}</span>
        <span role="columnheader">{t("name")}</span>
        <span role="columnheader">{t("value")}</span>
      </div>
      {records.map((record) => (
        <div
          className={`${RECORD_GRID} border-border/60 items-center border-t py-1.5`}
          key={`${record.type}:${record.name}:${record.value}`}
          role="row"
        >
          <span className="font-mono text-xs font-medium" role="cell">
            {record.type}
          </span>
          <span className="min-w-0" role="cell">
            <RecordValue label={t("name")} value={record.name} />
          </span>
          <span className="min-w-0 max-sm:col-start-2" role="cell">
            <RecordValue label={t("value")} value={record.value} />
          </span>
        </div>
      ))}
    </div>
  );
}

function ConnectRow({
  providerName,
  applyUrl,
}: {
  providerName: string;
  applyUrl: string;
}) {
  const t = useTranslations("sites.domainsPage.dns");
  const [navigating, setNavigating] = useState(false);
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium">{t("connectTitle")}</p>
        <p className="text-muted-foreground text-sm text-pretty">
          {t("connectDescription", { provider: providerName })}
        </p>
      </div>
      <Button
        className="w-full shrink-0 sm:w-auto"
        loading={navigating}
        onClick={() => {
          setNavigating(true);
          window.location.assign(applyUrl);
        }}
        size="sm"
      >
        {CLOUDFLARE_PROVIDER.test(providerName) ? (
          <Cloudflare aria-hidden="true" data-icon="inline-start" />
        ) : null}
        {t("connect", { provider: providerName })}
        <HugeiconsIcon
          data-icon="inline-end"
          icon={ArrowUpRight01Icon}
          strokeWidth={1.5}
        />
      </Button>
    </div>
  );
}

/** Mintlify-style DNS configuration: one-click setup when the provider supports it, else the records. */
export function SiteDnsSetup({
  organizationId,
  siteId,
  domain,
}: SiteDnsSetupProps) {
  const t = useTranslations("sites.domainsPage.dns");
  const connect = useSiteDomainConnect({ organizationId, siteId, domain });
  const result = connect.data;
  const ready = result?.status === "ready" ? result : null;
  const knownProvider =
    result && result.status !== "unavailable" ? result.providerName : undefined;
  const showCloudflareHint =
    !knownProvider || CLOUDFLARE_PROVIDER.test(knownProvider);

  return (
    <div className="space-y-5">
      {ready ? (
        <ConnectRow
          applyUrl={ready.applyUrl}
          providerName={ready.providerName}
        />
      ) : null}
      <div className="space-y-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            {ready ? t("manualTitle") : t("calloutTitle")}
          </p>
          <p className="text-muted-foreground text-sm text-pretty">
            {t("calloutDescription")}
            {showCloudflareHint ? ` ${t("cloudflareHint")}` : null}
          </p>
        </div>
        <SiteDnsRecordsTable records={domain.records} />
      </div>
    </div>
  );
}
