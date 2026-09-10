"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  NotificationToggleRow,
  NotificationToggleRowSkeleton,
} from "@/components/settings/notification-toggle-row";
import { SettingsPane } from "@/components/settings/settings-pane";
import { authClient } from "@/lib/auth/client";
import { dashboardOrpc } from "@/lib/orpc/query";
import { NOTIFICATION_TOGGLE_GROUPS } from "@/lib/settings/notification-toggles";
import type { NotificationSettings } from "@/types/settings/notifications";

interface MemberRow {
  userId: string;
  role: string;
  user?: { email?: string | null };
}

export function NotificationsSettingsPane() {
  const queryClient = useQueryClient();
  const { activeOrganization } = useOrganizationsContext();
  const organization = activeOrganization;

  const { data: session } = authClient.useSession();

  const { data: membersData, isPending: isLoadingMembers } = useQuery({
    queryKey: ["members", organization?.id],
    queryFn: async () => {
      const { data, error } = await authClient.organization.listMembers({
        query: { organizationId: organization?.id },
      });
      if (error) {
        throw new Error("Failed to fetch members");
      }
      return data;
    },
    enabled: !!organization?.id,
  });

  const members = (membersData?.members ?? []) as MemberRow[];

  const currentMember = members.find((m) => m.userId === session?.user?.id);
  const isOwner = currentMember?.role === "owner";

  const { data: settings, isPending: isLoadingSettings } = useQuery({
    ...dashboardOrpc.notifications.get.queryOptions({
      input: { organizationId: organization?.id ?? "" },
      select: (data) => data.settings as NotificationSettings,
    }),
    enabled: !!organization?.id,
  });

  const { mutate: updateSettings, isPending: isUpdating } = useMutation({
    mutationFn: async (data: Partial<NotificationSettings>) => {
      return dashboardOrpc.notifications.update.call({
        organizationId: organization?.id ?? "",
        ...data,
      });
    },
    onSuccess: () => {
      toast.success("Notification settings updated");
      queryClient.invalidateQueries({
        queryKey: dashboardOrpc.notifications.get.queryKey({
          input: { organizationId: organization?.id ?? "" },
        }),
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update notification settings"
      );
    },
  });

  if (!organization) {
    return (
      <SettingsPane>
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </SettingsPane>
    );
  }

  const controlsDisabled = !isOwner || isUpdating;

  return (
    <SettingsPane>
      {NOTIFICATION_TOGGLE_GROUPS.map((group) => (
        <TitleCard
          contentClassName="px-2 py-2"
          heading={group.heading}
          key={group.heading}
        >
          <div className="flex flex-col gap-1">
            {group.toggles.map((toggle) =>
              isLoadingSettings ? (
                <NotificationToggleRowSkeleton
                  key={`${group.heading}-${toggle.key}`}
                />
              ) : (
                <NotificationToggleRow
                  checked={settings?.[toggle.key] ?? toggle.defaultValue}
                  config={toggle}
                  disabled={controlsDisabled}
                  key={toggle.key}
                  onCheckedChange={(checked) =>
                    updateSettings({ [toggle.key]: checked })
                  }
                />
              )
            )}
          </div>
        </TitleCard>
      ))}

      {!(isLoadingMembers || isOwner) && (
        <p className="text-muted-foreground text-xs">
          Only the organization owner can manage notification settings.
        </p>
      )}
    </SettingsPane>
  );
}
