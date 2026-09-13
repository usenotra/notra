"use client";
import {
  ArrowReloadHorizontalIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { SettingsPane } from "@/components/settings/settings-pane";
import { WebhookCreateDialog } from "@/components/webhooks/create-dialog";
import { WebhookDeliveries } from "@/components/webhooks/deliveries";
import { WebhookDetailsSheet } from "@/components/webhooks/details-sheet";
import {
  WebhookEndpoints,
  WebhookMetrics,
} from "@/components/webhooks/overview";
import {
  WEBHOOK_PAGE_SIZE,
  WEBHOOK_REFRESH_INTERVAL_MS,
} from "@/constants/outbound-webhooks";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  OutboundDelivery,
  WebhookFilter,
  WebhookTab,
  WebhookWorkspaceProps,
} from "@/types/webhooks/outbound";

function WebhookWorkspace({ organizationId }: WebhookWorkspaceProps) {
  const [tab, setTab] = useState<WebhookTab>("deliveries");
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
        toast.success("Delivery queued for retry");
        setSelected(null);
        refresh();
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const remove = useMutation(
    dashboardOrpc.outboundWebhooks.remove.mutationOptions({
      onSuccess: () => {
        toast.success("Endpoint removed");
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
    <SettingsPane className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">Last 30 days</p>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="outline"
            aria-label="Refresh webhook activity"
            disabled={overview.isFetching}
            onClick={refresh}
          >
            <HugeiconsIcon
              icon={ArrowReloadHorizontalIcon}
              className="size-4"
            />
          </Button>
          <Button
            size="sm"
            disabled={!canManage}
            onClick={() => setCreating(true)}
          >
            <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
            Add endpoint
          </Button>
        </div>
      </div>
      <WebhookMetrics stats={overview.data?.stats} />
      {overview.isError ? (
        <div role="alert" className="space-y-2 rounded-lg border p-4 text-sm">
          <p>{overview.error.message}</p>
          <Button size="sm" variant="outline" onClick={refresh}>
            Try again
          </Button>
        </div>
      ) : null}
      <Tabs onValueChange={setTab} value={tab}>
        <TabsList aria-label="Webhook views">
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
          <TabsTrigger value="endpoints">
            Endpoints
            {overview.data ? (
              <Badge size="sm" variant="secondary">
                {endpoints.length}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>
        <TabsContent className="mt-4" value="deliveries">
          <WebhookDeliveries
            rows={rows}
            filter={filter}
            offset={offset}
            loading={overview.isPending}
            fetching={overview.isFetching}
            hasMore={deliveries.length > WEBHOOK_PAGE_SIZE}
            onSelect={setSelected}
            onFilter={(status) => {
              setFilter(status);
              setOffset(0);
            }}
            onPage={setOffset}
          />
        </TabsContent>
        <TabsContent className="mt-4" value="endpoints">
          {overview.isPending ? (
            <Skeleton className="h-32 rounded-lg" />
          ) : (
            <WebhookEndpoints
              endpoints={endpoints}
              disabled={remove.isPending || !canManage}
              onRemove={(endpointId) =>
                remove.mutate({ organizationId, endpointId })
              }
              onCreate={() => setCreating(true)}
            />
          )}
        </TabsContent>
      </Tabs>
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
