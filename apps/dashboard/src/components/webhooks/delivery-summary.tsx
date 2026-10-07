import { useLocale, useTranslations } from "use-intl";

import { WebhookStatus } from "@/components/webhooks/status";
import type { WebhookDeliverySummaryProps } from "@/types/webhooks/outbound";
import { formatLogTimestamp } from "@/utils/logs";

export function WebhookDeliverySummary({ entry }: WebhookDeliverySummaryProps) {
  const t = useTranslations("settings.panes.webhooks.details");
  const locale = useLocale();
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <code className="text-xs">{entry.eventType}</code>
        <WebhookStatus status={entry.status} />
      </div>
      <dl className="space-y-4 rounded-lg border p-4 text-xs">
        <div>
          <dt className="text-muted-foreground mb-1">{t("destination")}</dt>
          <dd className="font-mono break-all">{entry.url}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground mb-1">{t("eventId")}</dt>
          <dd className="font-mono break-all">{entry.eventId}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground mb-1">{t("deliveryId")}</dt>
          <dd className="font-mono break-all">{entry.id}</dd>
        </div>
        {entry.status === "retrying" ? (
          <div>
            <dt className="text-muted-foreground mb-1">{t("nextAttempt")}</dt>
            <dd>{formatLogTimestamp(entry.nextAttemptAt, locale)}</dd>
          </div>
        ) : null}
      </dl>
    </>
  );
}
