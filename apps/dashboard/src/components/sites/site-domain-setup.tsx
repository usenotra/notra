"use client";

import { Alert02Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@notra/ui/components/ui/alert";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import {
  SiteDnsRecordsTable,
  SiteDnsSetup,
} from "@/components/sites/site-domain-dns";
import { SiteProxySetup } from "@/components/sites/site-domain-proxy";
import { useSiteDomainCheck } from "@/lib/hooks/use-site-domain-check";
import { cn } from "@/lib/utils";
import type {
  SiteDomainSetupProps,
  SiteDomainSetupStepProps,
} from "@/types/components/sites";

export function SiteDomainSetup({
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
        <Alert variant={domain.lastCheckedAt ? "destructive" : "warning"}>
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={1.5} />
          <AlertTitle>
            {domain.lastCheckedAt ? t("lastErrorTitle") : t("setupErrorTitle")}
          </AlertTitle>
          <AlertDescription className="break-words">
            {domain.lastError}
          </AlertDescription>
        </Alert>
      ) : null}
      {isActive ? (
        setup
      ) : (
        <ol>
          <DomainSetupStep number={1}>{setup}</DomainSetupStep>
          <DomainSetupStep isLast number={2}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">{t("checkTitle")}</p>
                <p className="text-muted-foreground text-sm text-pretty">
                  {domain.kind === "proxy"
                    ? t("verifyProxyHint")
                    : t("verifyDnsHint")}
                </p>
              </div>
              <Button
                className="w-full shrink-0 sm:w-auto"
                loading={check.isPending}
                onClick={() => check.mutate()}
                size="sm"
                variant="outline"
              >
                <HugeiconsIcon icon={RefreshIcon} strokeWidth={1.5} />
                {t("verifyNow")}
              </Button>
            </div>
          </DomainSetupStep>
        </ol>
      )}
    </div>
  );
}

function DomainSetupStep({
  number,
  isLast = false,
  children,
}: SiteDomainSetupStepProps) {
  return (
    <li className={cn("relative flex gap-3", !isLast && "pb-6")}>
      {isLast ? null : (
        <span
          aria-hidden="true"
          className="bg-border absolute top-7 bottom-1 left-3 w-px -translate-x-1/2"
        />
      )}
      <span
        aria-hidden="true"
        className="text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums"
      >
        {number}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">{children}</div>
    </li>
  );
}
