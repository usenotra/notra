"use client";

import { GEO_SAMPLE_DATA_ENABLED } from "@notra/geo-core/constants/geo";
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
  ResponsiveAlertDialogTrigger,
} from "@notra/ui/components/shared/responsive-alert-dialog";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { dashboardOrpc } from "@/lib/orpc/query";
import { errorMessageOr } from "@/lib/utils";
import type { DevSampleDataCardProps } from "@/types/settings/general";

export function DevSampleDataCard({ organizationId }: DevSampleDataCardProps) {
  const t = useTranslations("settings.devSampleData");
  const tCommon = useTranslations("common.actions");
  const queryClient = useQueryClient();
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
          <ResponsiveAlertDialog>
            <ResponsiveAlertDialogTrigger
              render={
                <Button disabled={isPending} size="sm" variant="outline">
                  {t("clear")}
                </Button>
              }
            />
            <ResponsiveAlertDialogContent>
              <ResponsiveAlertDialogHeader>
                <ResponsiveAlertDialogTitle>
                  {t("clearTitle")}
                </ResponsiveAlertDialogTitle>
                <ResponsiveAlertDialogDescription>
                  {t("clearDescription")}
                </ResponsiveAlertDialogDescription>
              </ResponsiveAlertDialogHeader>
              <ResponsiveAlertDialogFooter>
                <ResponsiveAlertDialogCancel>
                  {tCommon("cancel")}
                </ResponsiveAlertDialogCancel>
                <ResponsiveAlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => clear.mutate()}
                >
                  {t("clear")}
                </ResponsiveAlertDialogAction>
              </ResponsiveAlertDialogFooter>
            </ResponsiveAlertDialogContent>
          </ResponsiveAlertDialog>
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
