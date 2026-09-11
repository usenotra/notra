import { LOG_CONTEXT_ALIASES, LOG_CONTEXT_FIELDS } from "@/constants/logs";
import type { LogEntryProps } from "@/types/logs/details-sheet";

export function LogTechnicalDetails({ entry }: LogEntryProps) {
  const payload = entry.payload;
  const contextFields = Object.entries(LOG_CONTEXT_FIELDS).flatMap(
    ([key, label]) => {
      const value =
        payload?.[key] ?? payload?.[LOG_CONTEXT_ALIASES[key] ?? key];
      return typeof value === "string" || typeof value === "number"
        ? [{ key, label, value: String(value) }]
        : [];
    }
  );
  return (
    <>
      {contextFields.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-medium">Run context</h3>
          <dl className="space-y-3">
            {contextFields.map((field) => (
              <div
                className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 text-sm"
                key={field.key}
              >
                <dt className="text-muted-foreground">{field.label}</dt>
                <dd className="break-all">{field.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      <section className="space-y-3 border-t pt-5">
        <h3 className="text-sm font-medium">Event metadata</h3>
        <dl className="space-y-3 text-xs">
          <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
            <dt className="text-muted-foreground">Log ID</dt>
            <dd className="font-mono break-all">{entry.id}</dd>
          </div>
          <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
            <dt className="text-muted-foreground">Timestamp</dt>
            <dd className="font-mono break-all">{entry.createdAt}</dd>
          </div>
          {entry.integrationId ? (
            <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
              <dt className="text-muted-foreground">Source ID</dt>
              <dd className="font-mono break-all">{entry.integrationId}</dd>
            </div>
          ) : null}
          {entry.referenceId ? (
            <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
              <dt className="text-muted-foreground">Reference ID</dt>
              <dd className="font-mono break-all">{entry.referenceId}</dd>
            </div>
          ) : null}
        </dl>
      </section>
      {payload && Object.keys(payload).length > 0 ? (
        <details className="space-y-3">
          <summary className="focus-visible:outline-ring cursor-pointer text-sm font-medium focus-visible:outline-2">
            Raw payload
          </summary>
          <pre className="bg-muted/30 max-h-80 overflow-auto rounded-xl p-4 font-mono text-xs leading-relaxed">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </details>
      ) : null}
    </>
  );
}
