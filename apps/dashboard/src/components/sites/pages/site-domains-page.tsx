"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { PageHeader } from "@/components/layout/page-header";
import { useSite } from "@/components/sites/site-context";
import { SiteDomainAddDialog } from "@/components/sites/site-domain-add-dialog";
import { SiteDomainsTable } from "@/components/sites/site-domains-table";
import {
  SITE_DOMAIN_CONNECT_OUTCOMES,
  SITE_DOMAIN_CONNECT_PARAM,
} from "@/constants/sites";
import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  SiteDomain,
  SiteDomainConnectOutcome,
  SiteDomainRemoveDialogProps,
} from "@/types/sites";
import { toErrorMessage } from "@/utils/error-message";
import { displayUrl } from "@/utils/site-links";

function parseConnectOutcome(
  value: string | null
): SiteDomainConnectOutcome | null {
  return (
    SITE_DOMAIN_CONNECT_OUTCOMES.find((outcome) => outcome === value) ?? null
  );
}

/** Toasts the result of a Domain Connect round trip once, then drops the query parameter. */
function useDomainConnectOutcomeToast() {
  const t = useTranslations("sites.domainsPage.connectResult");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const handled = useRef(false);
  const outcome = parseConnectOutcome(
    searchParams.get(SITE_DOMAIN_CONNECT_PARAM)
  );

  useEffect(() => {
    if (!outcome || handled.current) {
      return;
    }
    handled.current = true;
    if (outcome === "success") {
      toast.success(t("success"), { description: t("successDescription") });
    } else if (outcome === "cancelled") {
      toast.message(t("cancelled"), { description: t("cancelledDescription") });
    } else {
      toast.error(t("error"), { description: t("errorDescription") });
    }
    const next = new URLSearchParams(searchParams.toString());
    next.delete(SITE_DOMAIN_CONNECT_PARAM);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [outcome, pathname, router, searchParams, t]);
}

function RemoveDomainDialog({
  organizationId,
  siteId,
  domain,
  aliasOrigin,
  onOpenChange,
}: SiteDomainRemoveDialogProps) {
  const t = useTranslations("sites.domainsPage");
  const tCommon = useTranslations("common");
  const invalidateSites = useInvalidateSites();

  const removeMutation = useMutation({
    mutationFn: (domainId: string) =>
      dashboardOrpc.sites.domains.remove.call({
        organizationId,
        siteId,
        domainId,
      }),
    onSuccess: async () => {
      toast.success(t("removed"));
      onOpenChange(false);
      await invalidateSites();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("removeFailed")));
    },
  });

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={domain !== null}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("removeTitle")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {domain?.isPrimary
              ? t("removePrimaryDescription", {
                  hostname: domain.hostname,
                  alias: displayUrl(aliasOrigin),
                })
              : t("removeDescription", { hostname: domain?.hostname ?? "" })}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter>
          <Button
            disabled={removeMutation.isPending}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            {tCommon("actions.cancel")}
          </Button>
          <Button
            loading={removeMutation.isPending}
            onClick={() => {
              if (domain) {
                removeMutation.mutate(domain.id);
              }
            }}
            variant="destructive"
          >
            {t("removeConfirm")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export function SiteDomainsPage() {
  const { organizationId, siteId, detail } = useSite();
  const t = useTranslations("sites.domainsPage");
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<SiteDomain | null>(null);
  const { site, domains } = detail;
  useDomainConnectOutcomeToast();

  return (
    <div className="space-y-6">
      <PageHeader description={t("description")} title={t("title")}>
        <Button onClick={() => setAddOpen(true)}>
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
          {t("addDomain")}
        </Button>
      </PageHeader>

      <SiteDomainsTable
        aliasOrigin={site.aliasOrigin}
        domains={domains}
        mounts={site.mounts}
        onRemove={setRemoveTarget}
        organizationId={organizationId}
        siteId={siteId}
      />

      {domains.length === 0 ? (
        <p className="text-muted-foreground max-w-xl text-sm text-pretty">
          {t("empty.description")}
        </p>
      ) : null}

      <SiteDomainAddDialog
        mounts={site.mounts}
        onOpenChange={setAddOpen}
        open={addOpen}
        organizationId={organizationId}
        siteId={siteId}
      />
      <RemoveDomainDialog
        aliasOrigin={site.aliasOrigin}
        domain={removeTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveTarget(null);
          }
        }}
        organizationId={organizationId}
        siteId={siteId}
      />
    </div>
  );
}
