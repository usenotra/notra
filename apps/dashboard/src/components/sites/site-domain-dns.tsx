"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CopyButton } from "@notra/ui/components/ui/copy-button";
import { Cloudflare } from "@notra/ui/components/ui/svgs/cloudflare";
import { Vercel } from "@notra/ui/components/ui/svgs/vercel";
import { type ReactNode, useState } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import {
  SITE_CLOUDFLARE_PROVIDER_PATTERN,
  SITE_VERCEL_PROVIDER_PATTERN,
} from "@/constants/sites";
import { useSiteDomainConnect } from "@/lib/hooks/use-site-domain-connect";
import type {
  SiteDnsProviderButtonProps,
  SiteDnsRecordValueProps,
  SiteDnsRecordsTableProps,
  SiteDnsSetupProps,
} from "@/types/components/sites";
import { toastCopyError } from "@/utils/copy-to-clipboard";
import { siteDnsProviderDashboardUrl } from "@/utils/site-domains";

function RecordValue({ value, label }: SiteDnsRecordValueProps) {
  const tCommon = useTranslations("common");
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="min-w-0 truncate font-mono text-xs" title={value}>
        {value}
      </span>
      <CopyButton
        aria-label={tCommon("labels.copyLabel", { label })}
        className="shrink-0"
        copiedAriaLabel={tCommon("labels.labelCopied", { label })}
        onCopyError={toastCopyError}
        size="icon-xs"
        value={value}
      />
    </span>
  );
}

export function SiteDnsRecordsTable({ records }: SiteDnsRecordsTableProps) {
  const t = useTranslations("sites.domainsPage.dns");
  if (records.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("noRecords")}</p>;
  }
  return (
    <div className="bg-muted/30 overflow-hidden rounded-lg border">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-18" />
          <col className="w-[43%]" />
          <col />
        </colgroup>
        <thead>
          <tr className="text-muted-foreground text-left text-xs">
            <th className="py-2 pr-4 pl-3 font-normal">{t("type")}</th>
            <th className="py-2 pr-4 font-normal">{t("name")}</th>
            <th className="py-2 pr-3 font-normal">{t("value")}</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr
              className="bg-background border-t"
              key={`${record.type}:${record.name}:${record.value}`}
            >
              <td className="py-2 pr-4 pl-3 font-mono text-xs font-medium">
                {record.type}
              </td>
              <td className="min-w-0 py-2 pr-4">
                <RecordValue label={t("name")} value={record.name} />
              </td>
              <td className="min-w-0 py-2 pr-3">
                <RecordValue label={t("value")} value={record.value} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProviderButton({
  providerName,
  href,
  oneClick,
}: SiteDnsProviderButtonProps) {
  const t = useTranslations("sites.domainsPage.dns");
  const [navigating, setNavigating] = useState(false);
  let logo: ReactNode = null;
  if (SITE_CLOUDFLARE_PROVIDER_PATTERN.test(providerName)) {
    logo = <Cloudflare aria-hidden="true" data-icon="inline-start" />;
  } else if (SITE_VERCEL_PROVIDER_PATTERN.test(providerName)) {
    logo = <Vercel aria-hidden="true" data-icon="inline-start" />;
  }
  return (
    <Button
      className="w-full shrink-0 sm:w-auto"
      loading={navigating}
      onClick={() => {
        if (oneClick) {
          setNavigating(true);
          window.location.assign(href);
        } else {
          window.open(href, "_blank", "noopener,noreferrer");
        }
      }}
      size="sm"
      variant={oneClick ? "default" : "outline"}
    >
      {logo}
      {oneClick
        ? t("connect", { provider: providerName })
        : t("openProvider", { provider: providerName })}
      <HugeiconsIcon
        data-icon="inline-end"
        icon={ArrowUpRight01Icon}
        strokeWidth={1.5}
      />
    </Button>
  );
}

export function SiteDnsSetup({
  organizationId,
  siteId,
  domain,
}: SiteDnsSetupProps) {
  const t = useTranslations("sites.domainsPage.dns");
  const connect = useSiteDomainConnect({ organizationId, siteId, domain });
  const result = connect.data;
  const ready = result?.status === "ready" ? result : null;
  const provider =
    result && result.status !== "unavailable" ? result.providerName : undefined;
  const dashboardUrl =
    result?.status === "unsupported"
      ? siteDnsProviderDashboardUrl(result.providerName, result.zone)
      : null;
  const isCloudflare =
    !provider || SITE_CLOUDFLARE_PROVIDER_PATTERN.test(provider);

  let action: ReactNode = null;
  if (ready) {
    action = (
      <ProviderButton
        href={ready.applyUrl}
        oneClick
        providerName={ready.providerName}
      />
    );
  } else if (provider && dashboardUrl) {
    action = <ProviderButton href={dashboardUrl} providerName={provider} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium">
            {provider ? t("titleAt", { provider }) : t("calloutTitle")}
          </p>
          <p className="text-muted-foreground text-sm text-pretty">
            {ready
              ? t("connectDescription", { provider: ready.providerName })
              : t("calloutDescription")}
            {!ready && isCloudflare ? ` ${t("cloudflareHint")}` : null}
          </p>
        </div>
        {action}
      </div>
      <SiteDnsRecordsTable records={domain.records} />
    </div>
  );
}
