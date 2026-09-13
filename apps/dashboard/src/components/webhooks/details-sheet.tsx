"use client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/button";
import { WebhookAttemptList } from "@/components/webhooks/attempt-list";
import { WebhookDeliverySummary } from "@/components/webhooks/delivery-summary";
import { WebhookPayload } from "@/components/webhooks/payload";
import { WEBHOOK_REFRESH_INTERVAL_MS } from "@/constants/outbound-webhooks";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { WebhookDetailsProps } from "@/types/webhooks/outbound";
import { formatLogTimestamp } from "@/utils/logs";

export function WebhookDetailsSheet({
  organizationId,
  delivery,
  onClose,
  onRetry,
  retrying,
}: WebhookDetailsProps) {
  const detail = useQuery({
    ...dashboardOrpc.outboundWebhooks.detail.queryOptions({
      input: { organizationId, deliveryId: delivery?.id ?? "" },
    }),
    enabled: Boolean(delivery),
    refetchInterval: delivery ? WEBHOOK_REFRESH_INTERVAL_MS : false,
  });
  const entry = detail.data?.delivery ?? delivery;
  const loading = Boolean(delivery) && detail.isPending;
  return (
    <Sheet
      open={Boolean(delivery)}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <SheetContent className="flex flex-col gap-0 overflow-hidden rounded-2xl data-[side=right]:inset-y-2 data-[side=right]:right-2 data-[side=right]:h-auto data-[side=right]:w-[calc(100%-1rem)] data-[side=right]:border data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-5 pr-14">
          <SheetTitle>Delivery details</SheetTitle>
          <SheetDescription>
            {entry
              ? formatLogTimestamp(entry.createdAt, "long")
              : "Every attempt, from first send to final response."}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {entry ? <WebhookDeliverySummary entry={entry} /> : null}
          {loading ? (
            <div className="space-y-2" role="status" aria-label="Loading">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          ) : null}
          {detail.isError ? (
            <div className="space-y-2 text-sm" role="alert">
              <p>{detail.error.message}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => detail.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : null}
          {detail.data ? (
            <>
              <section className="space-y-3">
                <h3 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Attempt history
                </h3>
                <WebhookAttemptList attempts={detail.data.attempts} />
              </section>
              <WebhookPayload payload={detail.data.delivery.payload} />
            </>
          ) : null}
        </div>
        <SheetFooter className="flex flex-wrap gap-2 border-t px-6 py-4 sm:flex-row sm:justify-between">
          <p className="text-muted-foreground text-xs">
            Delivery history is kept for 30 days.
          </p>
          {entry?.status === "failed" ? (
            <Button
              disabled={retrying}
              variant="outline"
              onClick={() => onRetry(entry.id)}
            >
              {retrying ? "Queueing…" : "Retry delivery"}
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
