"use client";

import { RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { useSiteDomainCheck } from "@/lib/hooks/use-site-domain-check";
import { cn } from "@/lib/utils";
import type { SiteDomainCheckButtonProps } from "@/types/components/sites";

export function SiteDomainCheckButton({
  scope,
  domain,
  variant = "ghost",
}: SiteDomainCheckButtonProps) {
  const t = useTranslations("sites.domainsPage");
  const check = useSiteDomainCheck({ ...scope, domainId: domain.id });
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-busy={check.isPending}
            aria-label={t("checkLabel", { hostname: domain.hostname })}
            disabled={check.isPending}
            onClick={() => check.mutate()}
            size="icon-sm"
            variant={variant}
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
}
