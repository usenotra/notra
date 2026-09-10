import { IntegrationIcon } from "@/components/logs/integration-icon";
import { LogStatusBadge } from "@/components/logs/log-status-badge";
import { LOG_STATUS_DESCRIPTIONS } from "@/constants/logs";
import type { LogEntryProps } from "@/types/logs/details-sheet";
import { getSourceLabel } from "@/utils/logs";

export function LogEventSummary({ entry }: LogEntryProps) {
  return (
    <>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <LogStatusBadge
            status={{ label: entry.status, code: entry.statusCode }}
          />
          <span className="text-muted-foreground flex items-center gap-1.5">
            <IntegrationIcon type={entry.integrationType} />
            {getSourceLabel(entry.integrationType)}
          </span>
          {entry.statusCode != null && entry.statusCode > 0 ? (
            <span className="text-muted-foreground font-mono text-xs">
              HTTP {entry.statusCode}
            </span>
          ) : null}
        </div>
        <h3 className="text-lg leading-snug font-semibold wrap-break-word">
          {entry.title}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {LOG_STATUS_DESCRIPTIONS[entry.status]}
        </p>
      </section>
      {entry.errorMessage ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">
            {entry.status === "failed" ? "Error details" : "Reason"}
          </h3>
          <p
            className={`rounded-xl border p-4 text-sm leading-relaxed wrap-break-word whitespace-pre-wrap ${entry.status === "failed" ? "border-destructive/20 bg-destructive/5" : "bg-muted/30"}`}
          >
            {entry.errorMessage}
          </p>
        </section>
      ) : null}
    </>
  );
}
