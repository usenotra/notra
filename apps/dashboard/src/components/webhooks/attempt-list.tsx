import { useLocale, useTranslations } from "next-intl";

import type { WebhookAttemptListProps } from "@/types/webhooks/outbound";
import { formatLogTimestamp } from "@/utils/logs";

export function WebhookAttemptList({ attempts }: WebhookAttemptListProps) {
  const t = useTranslations("settings.panes.webhooks.details");
  const locale = useLocale();
  if (attempts.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("queued")}</p>;
  }
  return (
    <ol className="divide-y rounded-lg border">
      {attempts.map((attempt) => (
        <li key={attempt.id} className="space-y-2 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">
              {t("attempt", { number: attempt.attemptNumber })}
            </span>
            <span className="font-mono tabular-nums">
              {attempt.statusCode ??
                (attempt.finishedAt ? "ERR" : t("inFlight"))}
              <span className="text-muted-foreground ml-3">
                {attempt.durationMs === null ? "-" : `${attempt.durationMs} ms`}
              </span>
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            {formatLogTimestamp(attempt.startedAt, locale)}
          </p>
          {attempt.error ? (
            <p className="text-destructive font-mono text-xs break-words">
              {attempt.error.replaceAll("_", " ")}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
