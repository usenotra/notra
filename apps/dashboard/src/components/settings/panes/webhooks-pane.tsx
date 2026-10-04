"use client";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { SettingsPane } from "@/components/settings/settings-pane";
import { WebhookCreateDialog } from "@/components/webhooks/create-dialog";
import { WebhookDetailsSheet } from "@/components/webhooks/details-sheet";
import { WebhookWorkspaceView } from "@/components/webhooks/workspace";
import {
  WEBHOOK_PAGE_SIZE,
  WEBHOOK_REFRESH_INTERVAL_MS,
} from "@/constants/outbound-webhooks";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  OutboundDelivery,
  WebhookFilter,
  WebhookWorkspaceProps,
} from "@/types/webhooks/outbound";

function WebhookWorkspace({ organizationId }: WebhookWorkspaceProps) {
  const t = useTranslations("settings.panes.webhooks");
  const [filter, setFilter] = useState<WebhookFilter>("all");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<OutboundDelivery | null>(null);
  const [creating, setCreating] = useState(false);
  const overview = useQuery({
    ...dashboardOrpc.outboundWebhooks.overview.queryOptions({
      input: { organizationId, offset, status: filter },
    }),
    refetchInterval: WEBHOOK_REFRESH_INTERVAL_MS,
  });
  const refresh = () => {
    void overview.refetch();
  };
  const retry = useMutation(
    dashboardOrpc.outboundWebhooks.retry.mutationOptions({
      onSuccess: () => {
        toast.success(t("toasts.retryQueued"));
        setSelected(null);
        refresh();
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const remove = useMutation(
    dashboardOrpc.outboundWebhooks.remove.mutationOptions({
      onSuccess: () => {
        toast.success(t("toasts.endpointRemoved"));
        refresh();
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const canManage = overview.data?.canManage ?? false;
  const endpoints = overview.data?.endpoints ?? [];
  const deliveries = overview.data?.deliveries ?? [];
  const rows = deliveries.slice(0, WEBHOOK_PAGE_SIZE);
  return (
    <SettingsPane>
      <WebhookWorkspaceView
        stats={overview.data?.stats}
        activity={overview.data?.activity}
        endpoints={endpoints}
        rows={rows}
        canManage={canManage}
        loading={overview.isPending}
        fetching={overview.isFetching}
        error={overview.isError ? overview.error.message : null}
        filter={filter}
        offset={offset}
        hasMore={deliveries.length > WEBHOOK_PAGE_SIZE}
        removing={remove.isPending}
        onFilter={(status) => {
          setFilter(status);
          setOffset(0);
        }}
        onPage={setOffset}
        onRefresh={refresh}
        onSelect={setSelected}
        onCreate={() => setCreating(true)}
        onRemove={(endpointId) => remove.mutate({ organizationId, endpointId })}
      />
      {creating ? (
        <WebhookCreateDialog
          organizationId={organizationId}
          open
          onOpenChange={setCreating}
          onCreated={refresh}
        />
      ) : null}
      <WebhookDetailsSheet
        organizationId={organizationId}
        delivery={selected}
        onClose={() => setSelected(null)}
        retrying={retry.isPending}
        canRetry={canManage}
        onRetry={(deliveryId) => retry.mutate({ organizationId, deliveryId })}
      />
    </SettingsPane>
  );
}

export function WebhooksSettingsPane() {
  const { activeOrganization } = useOrganizationsContext();
  if (!activeOrganization) {
    return (
      <SettingsPane className="space-y-5">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </SettingsPane>
    );
  }
  return (
    <WebhookWorkspace
      key={activeOrganization.id}
      organizationId={activeOrganization.id}
    />
  );
}
