"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CopyButton } from "@notra/ui/components/ui/copy-button";
import { Cloudflare } from "@notra/ui/components/ui/svgs/cloudflare";
import { Vercel } from "@notra/ui/components/ui/svgs/vercel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notra/ui/components/ui/table";
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
    <Table className="min-w-[32rem] table-fixed">
      <colgroup>
        <col className="w-18" />
        <col className="w-[25%]" />
        <col />
        <col className="w-36" />
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead>{t("type")}</TableHead>
          <TableHead>{t("name")}</TableHead>
          <TableHead>{t("value")}</TableHead>
          <TableHead>{t("proxy")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow key={`${record.type}:${record.name}:${record.value}`}>
            <TableCell>
              <span className="font-mono text-xs font-medium">
                {record.type}
              </span>
            </TableCell>
            <TableCell>
              <RecordValue label={t("name")} value={record.name} />
            </TableCell>
            <TableCell>
              <RecordValue label={t("value")} value={record.value} />
            </TableCell>
            <TableCell>
              <span className="text-muted-foreground text-xs">
                {record.type === "CNAME" ? (
                  <span title={t("proxyRequirement")}>{t("dnsOnly")}</span>
                ) : (
                  t("proxyNotApplicable")
                )}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
  checkAction,
}: SiteDnsSetupProps) {
  const connect = useSiteDomainConnect({ organizationId, siteId, domain });
  const result = connect.data;
  const ready = result?.status === "ready" ? result : null;
  const provider =
    result && result.status !== "unavailable" ? result.providerName : undefined;
  const dashboardUrl =
    result?.status === "unsupported"
      ? siteDnsProviderDashboardUrl(result.providerName, result.zone)
      : null;
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
      <div className="flex flex-wrap items-center gap-2">
        {action}
        {checkAction}
      </div>
      <SiteDnsRecordsTable records={domain.records} />
    </div>
  );
}
