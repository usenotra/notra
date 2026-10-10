"use client";

import { ConfirmDialog } from "@notra/ui/components/shared/confirm-dialog";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { SiteDeleteDialog } from "@/components/sites/site-delete-dialog";
import { useInvalidateSites } from "@/lib/hooks/use-sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SiteSettingsDangerZoneRowProps } from "@/types/components/site-settings-danger-zone";
import type { SiteSettingsDangerZoneProps } from "@/types/components/sites";
import { toErrorMessage } from "@/utils/error-message";

function DangerZoneRow({
  title,
  description,
  action,
}: SiteSettingsDangerZoneRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-5">
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-sm text-pretty">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function SiteSettingsDangerZone({
  organizationId,
  organizationSlug,
  siteId,
  site,
}: SiteSettingsDangerZoneProps) {
  const t = useTranslations("sites.settings");
  const invalidateSites = useInvalidateSites();
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const suspended = site.status === "suspended";

  const suspendMutation = useMutation({
    mutationFn: (next: boolean) =>
      dashboardOrpc.sites.setSuspended.call({
        organizationId,
        siteId,
        suspended: next,
      }),
    onSuccess: async (_result, next) => {
      toast.success(next ? t("offline.done") : t("offline.restored"));
      setOfflineOpen(false);
      await invalidateSites();
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, t("offline.failed")));
    },
  });

  return (
    <>
      <TitleCard
        as="section"
        className="border-destructive/50 bg-destructive/5"
        contentClassName="p-0"
        heading={t("dangerZone")}
        headingAs="h2"
      >
        <div className="divide-border divide-y">
          <DangerZoneRow
            action={
              suspended ? (
                <Button
                  loading={suspendMutation.isPending}
                  onClick={() => suspendMutation.mutate(false)}
                  type="button"
                  variant="outline"
                >
                  {t("offline.restore")}
                </Button>
              ) : (
                <Button
                  onClick={() => setOfflineOpen(true)}
                  type="button"
                  variant="destructive"
                >
                  {t("offline.action")}
                </Button>
              )
            }
            description={
              suspended
                ? t("offline.restoreDescription")
                : t("offline.description")
            }
            title={suspended ? t("offline.restoreTitle") : t("offline.title")}
          />
          <DangerZoneRow
            action={
              <Button
                onClick={() => setDeleteOpen(true)}
                type="button"
                variant="destructive"
              >
                {t("delete.action")}
              </Button>
            }
            description={t("delete.summary")}
            title={t("delete.title")}
          />
        </div>
      </TitleCard>

      <ConfirmDialog
        confirmLabel={t("offline.action")}
        description={t("offline.confirmDescription")}
        variant="destructive"
        onConfirm={() => suspendMutation.mutate(true)}
        onOpenChange={setOfflineOpen}
        open={offlineOpen}
        pending={suspendMutation.isPending}
        title={t("offline.confirmTitle")}
      />
      <SiteDeleteDialog
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        organizationId={organizationId}
        organizationSlug={organizationSlug}
        siteId={siteId}
        siteName={site.name}
      />
    </>
  );
}
