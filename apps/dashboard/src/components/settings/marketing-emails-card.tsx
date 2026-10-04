"use client";

import { Megaphone01Icon } from "@hugeicons/core-free-icons";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  NotificationToggleRow,
  NotificationToggleRowSkeleton,
} from "@/components/settings/notification-toggle-row";
import { dashboardOrpc } from "@/lib/orpc/query";

/** The signed-in user's own marketing opt-in, independent of the organization. */
export function MarketingEmailsCard() {
  const t = useTranslations("settings.panes.notifications");
  const tLabels = useTranslations("common.labels");
  const queryClient = useQueryClient();
  const queryKey = dashboardOrpc.notifications.marketing.queryKey();

  const { data, isPending } = useQuery(
    dashboardOrpc.notifications.marketing.queryOptions()
  );

  const { mutate, isPending: isUpdating } = useMutation({
    mutationFn: (enabled: boolean) =>
      dashboardOrpc.notifications.updateMarketing.call({ enabled }),
    onSuccess: (state) => {
      queryClient.setQueryData(queryKey, state);
      if (!state.blockedByUnsubscribe) {
        toast.success(t("updated"));
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("updateFailed"));
      // The choice is saved before Brew is called, so show what was stored.
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return (
    <TitleCard contentClassName="px-2 py-2" heading={t("groups.marketing")}>
      {isPending ? (
        <NotificationToggleRowSkeleton />
      ) : (
        <NotificationToggleRow
          checked={data?.enabled ?? false}
          config={{
            key: "marketingEmails",
            label: tLabels("productUpdates"),
            description: t("toggles.marketingEmails.description"),
            defaultValue: false,
            icon: Megaphone01Icon,
          }}
          disabled={isUpdating}
          onCheckedChange={mutate}
        />
      )}
      <p className="text-muted-foreground px-3 pt-1 pb-2 text-xs">
        {data?.blockedByUnsubscribe
          ? t("marketingBlocked")
          : t("marketingPersonal")}
      </p>
    </TitleCard>
  );
}
