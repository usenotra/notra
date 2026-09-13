import type { WebhookAttemptListProps } from "@/types/webhooks/outbound";
import { formatLogTimestamp } from "@/utils/logs";

export function WebhookAttemptList({ attempts }: WebhookAttemptListProps) {
  if (attempts.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Queued. The first attempt has not started yet.
      </p>
    );
  }
  return (
    <ol className="divide-y rounded-lg border">
      {attempts.map((attempt) => (
        <li key={attempt.id} className="space-y-2 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Attempt {attempt.attemptNumber}</span>
            <span className="font-mono tabular-nums">
              {attempt.statusCode ?? (attempt.finishedAt ? "ERR" : "Sending")}
              <span className="text-muted-foreground ml-3">
                {attempt.durationMs === null ? "—" : `${attempt.durationMs} ms`}
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
  );
}
