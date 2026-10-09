"use client";

import { ArrowUpRight01Icon, CloudIcon } from "@hugeicons/core-free-icons";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import type { ReactNode } from "react";
import { useTranslations } from "use-intl";

import { buttonVariants } from "@/components/button";
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
        <col className="w-44" />
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
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      aria-label={
                        record.type === "CNAME"
                          ? `${t("dnsOnly")}. ${t("proxyRequirement")}`
                          : t("proxyNotApplicable")
                      }
                      className="text-muted-foreground focus-visible:outline-ring inline-flex min-h-6 min-w-6 cursor-help items-center gap-1.5 rounded-sm text-xs focus-visible:outline-2"
                      type="button"
                    />
                  }
                >
                  {record.type === "CNAME" ? (
                    <>
                      <HugeiconsIcon
                        aria-hidden="true"
                        className="fill-muted-foreground/20 size-4"
                        icon={CloudIcon}
                        strokeWidth={1.5}
                      />
                      {t("dnsOnly")}
                    </>
                  ) : (
                    <span aria-hidden="true">—</span>
                  )}
                </TooltipTrigger>
                <TooltipContent className="max-w-64">
                  {record.type === "CNAME" ? (
                    <div className="space-y-2 py-1">
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon
                          aria-hidden="true"
                          className="size-4 fill-current/20"
                          icon={CloudIcon}
                          strokeWidth={1.5}
                        />
                        <span className="font-medium">{t("dnsOnly")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Cloudflare aria-hidden="true" className="size-4" />
                        <span className="line-through">{t("proxied")}</span>
                      </div>
                      <p>{t("proxyRequirement")}</p>
                    </div>
                  ) : (
                    t("proxyNotApplicableDescription")
                  )}
                </TooltipContent>
              </Tooltip>
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
  let logo: ReactNode = null;
  if (SITE_CLOUDFLARE_PROVIDER_PATTERN.test(providerName)) {
    logo = (
      <Cloudflare
        aria-hidden="true"
        className="size-3.5"
        data-icon="inline-start"
      />
    );
  } else if (SITE_VERCEL_PROVIDER_PATTERN.test(providerName)) {
    logo = (
      <Vercel
        aria-hidden="true"
        className="size-3 -translate-y-px"
        data-icon="inline-start"
      />
    );
  }
  return (
    <a
      className={buttonVariants({
        size: "sm",
        variant: oneClick ? "default" : "outline",
      })}
      href={href}
      rel={oneClick ? undefined : "noopener noreferrer"}
      target={oneClick ? undefined : "_blank"}
    >
      {logo}
      {oneClick
        ? t("connect", { provider: providerName })
        : t("openProvider", { provider: providerName })}
      <HugeiconsIcon
        className="size-3.5"
        data-icon="inline-end"
        icon={ArrowUpRight01Icon}
        strokeWidth={1.5}
      />
    </a>
  );
}

export function SiteDnsSetup({
  organizationId,
  siteId,
  domain,
  checkAction,
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
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
        {ready ? (
          <p className="text-muted-foreground me-auto text-xs">
            {t("automaticDescription", { provider: ready.providerName })}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          {action}
          {checkAction}
        </div>
      </div>
      <SiteDnsRecordsTable records={domain.records} />
    </div>
  );
}
