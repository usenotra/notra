"use client";

import { Alert02Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import {
  SiteDnsRecordsTable,
  SiteDnsSetup,
} from "@/components/sites/site-domain-dns";
import { SiteProxySetup } from "@/components/sites/site-domain-proxy";
import { useSiteDomainCheck } from "@/lib/hooks/use-site-domain-check";
import { cn } from "@/lib/utils";
import type { SiteDomainSetupProps } from "@/types/components/sites";

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
  const checkAction = (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-busy={check.isPending}
            aria-label={t("checkLabel", { hostname: domain.hostname })}
            disabled={check.isPending}
            onClick={() => check.mutate()}
            size="icon-sm"
            variant="outline"
          />
        }
      >
        <HugeiconsIcon
          aria-hidden="true"
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

  let setup = (
    <SiteDnsSetup
      checkAction={checkAction}
      domain={domain}
      organizationId={organizationId}
      siteId={siteId}
    />
  );
  if (domain.kind === "proxy") {
    setup = (
      <SiteProxySetup
        aliasOrigin={aliasOrigin}
        checkAction={checkAction}
        hostname={domain.hostname}
        mounts={mounts}
      />
    );
  } else if (isActive) {
    setup = <SiteDnsRecordsTable records={domain.records} />;
  }

  return (
    <div className="space-y-3 px-4 py-4 sm:ps-6 sm:pe-5">
      {domain.status === "failed" && domain.lastError ? (
        <p
          className="text-destructive flex items-start gap-2 text-sm"
          role="alert"
        >
          <HugeiconsIcon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
            icon={Alert02Icon}
            strokeWidth={1.5}
          />
          <span className="min-w-0 break-words">
            <span className="font-medium">{t("lastErrorTitle")}</span>{" "}
            {domain.lastError}
          </span>
        </p>
      ) : null}
      {isActive && domain.kind !== "proxy" ? (
        <div className="flex justify-end">{checkAction}</div>
      ) : null}
      {setup}
      {!isActive && domain.status !== "failed" && domain.lastError ? (
        <details className="text-muted-foreground text-xs">
          <summary className="hover:text-foreground cursor-pointer">
            {t("lastCheckDetails")}
          </summary>
          <p className="pt-2 break-words">{domain.lastError}</p>
        </details>
      ) : null}
    </div>
  );
}
