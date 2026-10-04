"use client";

import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { DevSampleDataCard } from "@/components/settings/dev-sample-data-card";
import { SettingsPane } from "@/components/settings/settings-pane";
import { geoDbQueryKey } from "@/lib/db/geo-collections";
import { useRouter } from "@/lib/navigation";
import { dashboardOrpc } from "@/lib/orpc/query";
import { errorMessageOr } from "@/lib/utils";
import { geoOnboardingPath } from "@/utils/geo-paths";

export function DevSettingsPane() {
  const t = useTranslations("settings.panes.dev");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id;
  const replay = useMutation({
    mutationFn: async () => {
      if (!organizationId) {
        throw new Error(tCommon("labels.noActiveOrganization"));
      }
      const result = await dashboardOrpc.onboarding.createDevReplayProject.call(
        {
          organizationId,
        }
      );
      return { ...result, organizationId };
    },
    onSuccess: async ({ organizationId: replayOrganizationId, projectId }) => {
      await queryClient.invalidateQueries({
        queryKey: geoDbQueryKey("projects", {
          organizationId: replayOrganizationId,
        }),
      });
      router.push(geoOnboardingPath(projectId, true));
    },
    onError: (error) => {
      toast.error(
        errorMessageOr(
          error instanceof Error ? error.message : undefined,
          t("replayFailed")
        )
      );
    },
  });

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <SettingsPane>
      <TitleCard heading={t("onboarding")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">{t("replayTitle")}</p>
            <p className="text-muted-foreground text-xs">
              {t("replayDescription")}
            </p>
          </div>
          <Button
            className="shrink-0"
            disabled={!organizationId}
            loading={replay.isPending}
            onClick={() => replay.mutate()}
            size="sm"
          >
            {t("replay")}
          </Button>
        </div>
      </TitleCard>
      {organizationId ? (
        <DevSampleDataCard organizationId={organizationId} />
      ) : null}
    </SettingsPane>
  );
}
