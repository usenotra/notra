import { WebhookStatus } from "@/components/webhooks/status";
import type { WebhookDeliverySummaryProps } from "@/types/webhooks/outbound";
import { formatLogTimestamp } from "@/utils/logs";

export function WebhookDeliverySummary({ entry }: WebhookDeliverySummaryProps) {
  return (
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
  );
}
