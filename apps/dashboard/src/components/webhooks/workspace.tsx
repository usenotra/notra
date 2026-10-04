"use client";
import {
  ArrowReloadHorizontalIcon,
  Link04Icon,
  PlusSignIcon,
  SentIcon,
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
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/button";
import { SlideInTabIcon } from "@/components/geo/slide-in-tab-icon";
import { SlidingTabIndicator } from "@/components/geo/sliding-tab-indicator";
import {
  WebhookDeliveries,
  WebhookStatusFilter,
} from "@/components/webhooks/deliveries";
import {
  WebhookEndpoints,
  WebhookMetrics,
} from "@/components/webhooks/overview";
import type {
  WebhookTab,
  WebhookWorkspaceViewProps,
} from "@/types/webhooks/outbound";

/** Data-free webhooks workspace, shared by the settings pane and the design-system preview. */
export function WebhookWorkspaceView({
  stats,
  activity,
  endpoints,
  rows,
  canManage,
  loading,
  fetching,
  error,
  filter,
  offset,
  hasMore,
  removing,
  onFilter,
  onPage,
  onRefresh,
  onSelect,
  onCreate,
  onRemove,
  defaultTab = "deliveries",
}: WebhookWorkspaceViewProps) {
  const t = useTranslations("settings.panes.webhooks");
  const tActions = useTranslations("common.actions");
  const [tab, setTab] = useState<WebhookTab>(defaultTab);
  return (
    <div className="space-y-5">
      <WebhookMetrics stats={stats} activity={activity} />
      {error ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm"
        >
          <p className="min-w-0">{error}</p>
          <Button size="sm" variant="outline" onClick={onRefresh}>
            {tActions("tryAgain")}
          </Button>
        </div>
      ) : null}
      <Tabs className="gap-3" onValueChange={setTab} value={tab}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList aria-label={t("views")} indicator={false}>
            <SlidingTabIndicator value={tab} />
            <TabsTrigger className="group/tab" value="deliveries">
              <SlideInTabIcon>
                <HugeiconsIcon icon={SentIcon} size={15} />
              </SlideInTabIcon>
              {t("deliveries")}
            </TabsTrigger>
            <TabsTrigger className="group/tab" value="endpoints">
              <SlideInTabIcon>
                <HugeiconsIcon icon={Link04Icon} size={15} />
              </SlideInTabIcon>
              {t("endpoints")}
              {loading ? null : (
                <Badge size="sm" variant="secondary">
                  {endpoints.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {tab === "deliveries" ? (
              <WebhookStatusFilter filter={filter} onFilter={onFilter} />
            ) : null}
            <Button
              size="icon"
              variant="outline"
              aria-label={t("refresh")}
              onClick={onRefresh}
            >
              <HugeiconsIcon icon={ArrowReloadHorizontalIcon} />
            </Button>
            <Button disabled={!canManage} onClick={onCreate}>
              <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
              {t("addEndpoint")}
            </Button>
          </div>
        </div>
        <TabsContent value="deliveries">
          <WebhookDeliveries
            rows={rows}
            filter={filter}
            offset={offset}
            loading={loading}
            fetching={fetching}
            hasMore={hasMore}
            hasEndpoints={endpoints.length > 0}
            canCreate={canManage}
            onCreate={onCreate}
            onSelect={onSelect}
            onFilter={onFilter}
            onPage={onPage}
          />
        </TabsContent>
        <TabsContent value="endpoints">
          {loading ? (
            <Skeleton className="h-32 rounded-lg" />
          ) : (
            <WebhookEndpoints
              endpoints={endpoints}
              disabled={removing || !canManage}
              onRemove={onRemove}
              onCreate={onCreate}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
