"use client";

import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { DevSampleDataCard } from "@/components/settings/dev-sample-data-card";
import { SettingsPane } from "@/components/settings/settings-pane";
import { dashboardOrpc } from "@/lib/orpc/query";
import { errorMessageOr } from "@/lib/utils";
import { geoOnboardingPath } from "@/utils/geo-paths";

export function DevSettingsPane() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id;
  const replay = useMutation({
    mutationFn: () => {
      if (!organizationId) {
        throw new Error("No active organization");
      }
      return dashboardOrpc.onboarding.createDevReplayProject.call({
        organizationId,
      });
    },
    onSuccess: async ({ projectId }) => {
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.geo.key(),
      });
      router.push(geoOnboardingPath(projectId, true));
    },
    onError: (error) => {
      toast.error(
        errorMessageOr(
          error instanceof Error ? error.message : undefined,
          "Unable to start onboarding replay"
        )
      );
    },
  });

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <SettingsPane>
      <TitleCard heading="Onboarding">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Replay GEO onboarding</p>
            <p className="text-muted-foreground text-xs">
              Creates an isolated project and opens the visibility and
              competitor steps. Your existing projects and scan history stay
              unchanged.
            </p>
          </div>
          <Button
            className="shrink-0"
            disabled={!organizationId || replay.isPending}
            onClick={() => replay.mutate()}
            size="sm"
          >
            {replay.isPending ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Starting…
              </>
            ) : (
              "Replay onboarding"
            )}
          </Button>
        </div>
      </TitleCard>
      {organizationId ? (
        <DevSampleDataCard organizationId={organizationId} />
      ) : null}
    </SettingsPane>
  );
}
