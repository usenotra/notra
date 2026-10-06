"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ConfirmDialog } from "@notra/ui/components/shared/confirm-dialog";
import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { useSite } from "@/components/sites/site-context";
import { SiteDomainAddDialog } from "@/components/sites/site-domain-add-dialog";
import { SiteDomainsTable } from "@/components/sites/site-domains-table";
import { useDomainConnectOutcomeToast } from "@/lib/hooks/use-domain-connect-outcome-toast";
import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SiteDomainRemoveDialogProps } from "@/types/components/sites";
import type { SiteDomain } from "@/types/sites";
import { toErrorMessage } from "@/utils/error-message";
import { displayUrl } from "@/utils/site-links";

function RemoveDomainDialog({
  organizationId,
  siteId,
  domain,
  aliasOrigin,
  onOpenChange,
}: SiteDomainRemoveDialogProps) {
  const t = useTranslations("sites.domainsPage");
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
    <ConfirmDialog
      confirmLabel={t("removeConfirm")}
      description={
        domain?.isPrimary
          ? t("removePrimaryDescription", {
              hostname: domain.hostname,
              alias: displayUrl(aliasOrigin),
            })
          : t("removeDescription", { hostname: domain?.hostname ?? "" })
      }
      variant="destructive"
      onConfirm={() => {
        if (domain) {
          removeMutation.mutate(domain.id);
        }
      }}
      onOpenChange={onOpenChange}
      open={domain !== null}
      pending={removeMutation.isPending}
      title={t("removeTitle")}
    />
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
      <PageHeading description={t("description")} title={t("title")}>
        <Button onClick={() => setAddOpen(true)}>
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
          {t("addDomain")}
        </Button>
      </PageHeading>

      <SiteDomainsTable
        aliasOrigin={site.aliasOrigin}
        domains={domains}
        mounts={site.mounts}
        onRemove={setRemoveTarget}
        organizationId={organizationId}
        siteId={siteId}
      />

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
