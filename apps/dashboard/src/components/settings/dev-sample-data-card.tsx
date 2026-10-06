"use client";

import { GEO_SAMPLE_DATA_ENABLED } from "@notra/geo-core/constants/geo";
import { ConfirmDialog } from "@notra/ui/components/shared/confirm-dialog";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { dashboardOrpc } from "@/lib/orpc/query";
import { errorMessageOr } from "@/lib/utils";
import type { DevSampleDataCardProps } from "@/types/settings/general";

export function DevSampleDataCard({ organizationId }: DevSampleDataCardProps) {
  const t = useTranslations("settings.devSampleData");
  const queryClient = useQueryClient();
  const [clearOpen, setClearOpen] = useState(false);
  const reset = useMutation({
    mutationFn: () => dashboardOrpc.geo.sampleData.call({ organizationId }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.key(),
      });
      if (!result.analyticsIngested) {
        toast.success(t("resetSuccess"), {
          description: t("resetDescriptionNoTinybird", {
            mentionChecks: result.mentionChecks,
          }),
        });
        return;
      }
      toast.success(t("resetSuccess"), {
        description: t("resetDescription", {
          mentionChecks: result.mentionChecks,
          trafficEvents: result.trafficEvents,
        }),
      });
    },
    onError: (error) => {
      toast.error(
        errorMessageOr(
          error instanceof Error ? error.message : undefined,
          t("resetFailed")
        )
      );
    },
  });
  const clear = useMutation({
    mutationFn: () =>
      dashboardOrpc.geo.sampleDataClear.call({ organizationId }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.key(),
      });
      toast.success(result.cleared ? t("cleared") : t("nothingToClear"));
    },
    onError: (error) => {
      toast.error(
        errorMessageOr(
          error instanceof Error ? error.message : undefined,
          t("clearFailed")
        )
      );
    },
  });
  const isPending = reset.isPending || clear.isPending;

  if (!GEO_SAMPLE_DATA_ENABLED) {
    return null;
  }

  return (
    <TitleCard heading={t("heading")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">{t("title")}</p>
          <p className="text-muted-foreground text-xs">{t("description")}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <ConfirmDialog
            confirmLabel={t("clear")}
            description={t("clearDescription")}
            onConfirm={() =>
              clear.mutate(undefined, {
                onSuccess: () => setClearOpen(false),
              })
            }
            onOpenChange={setClearOpen}
            open={clearOpen}
            pending={clear.isPending}
            title={t("clearTitle")}
            trigger={
              <Button disabled={isPending} size="sm" variant="outline">
                {t("clear")}
              </Button>
            }
            variant="destructive"
          />
          <Button
            disabled={clear.isPending}
            loading={reset.isPending}
            onClick={() => reset.mutate()}
            size="sm"
          >
            {t("reset")}
          </Button>
        </div>
      </div>
    </TitleCard>
  );
}
