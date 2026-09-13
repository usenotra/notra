"use client";
import { Copy01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import { WebhookStatus } from "@/components/webhooks/status";
import { WEBHOOK_REFRESH_INTERVAL_MS } from "@/constants/outbound-webhooks";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { WebhookDetailsProps } from "@/types/webhooks/outbound";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";
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
          {entry ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <code className="text-xs">{entry.eventType}</code>
                <WebhookStatus status={entry.status} />
              </div>
              <dl className="space-y-4 rounded-lg border p-4 text-xs">
                <div>
                  <dt className="text-muted-foreground mb-1">Destination</dt>
                  <dd className="font-mono break-all">{entry.url}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1">Event ID</dt>
                  <dd className="font-mono break-all">{entry.eventId}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1">Delivery ID</dt>
                  <dd className="font-mono break-all">{entry.id}</dd>
                </div>
                {entry.status === "retrying" ? (
                  <div>
                    <dt className="text-muted-foreground mb-1">Next attempt</dt>
                    <dd>{formatLogTimestamp(entry.nextAttemptAt, "long")}</dd>
                  </div>
                ) : null}
              </dl>
            </>
          ) : null}
          {delivery && detail.isPending ? (
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
                {detail.data.attempts.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Queued. The first attempt has not started yet.
                  </p>
                ) : (
                  <ol className="divide-y rounded-lg border">
                    {detail.data.attempts.map((attempt) => (
                      <li key={attempt.id} className="space-y-2 p-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">
                            Attempt {attempt.attemptNumber}
                          </span>
                          <span className="font-mono tabular-nums">
                            {attempt.statusCode ??
                              (attempt.finishedAt ? "ERR" : "Sending")}
                            <span className="text-muted-foreground ml-3">
                              {attempt.durationMs === null
                                ? "—"
                                : `${attempt.durationMs} ms`}
                            </span>
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {formatLogTimestamp(attempt.startedAt, "long")}
                        </p>
                        {attempt.error ? (
                          <p className="text-destructive font-mono text-xs break-words">
                            {attempt.error.replaceAll("_", " ")}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                    Request payload
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      copyTextToClipboard(
                        detail.data.delivery.payload,
                        "Payload copied"
                      )
                    }
                  >
                    <HugeiconsIcon icon={Copy01Icon} className="size-4" />
                    Copy
                  </Button>
                </div>
                <pre className="bg-muted/30 overflow-x-auto rounded-lg border p-4 font-mono text-xs leading-relaxed">
                  {detail.data.delivery.payload}
                </pre>
              </section>
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
