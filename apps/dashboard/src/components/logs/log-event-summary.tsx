import { useTranslations } from "next-intl";

import { IntegrationIcon } from "@/components/logs/integration-icon";
import { LogStatusBadge } from "@/components/logs/log-status-badge";
import { useLogSourceLabel } from "@/lib/hooks/use-log-source-label";
import type { LogEntryProps } from "@/types/logs/details-sheet";
import { isLogSourceFilter } from "@/utils/log-labels";

export function LogEventSummary({ entry }: LogEntryProps) {
  const t = useTranslations("logs");
  const sourceLabel = useLogSourceLabel();
  return (
    <>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <LogStatusBadge
            status={{ label: entry.status, code: entry.statusCode }}
          />
          <span className="text-muted-foreground flex items-center gap-1.5">
            <IntegrationIcon type={entry.integrationType} />
            {isLogSourceFilter(entry.integrationType)
              ? sourceLabel(entry.integrationType)
              : entry.integrationType}
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
          {t(`statusDescriptions.${entry.status}`)}
        </p>
      </section>
      {entry.errorMessage ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">
            {entry.status === "failed"
              ? t("details.errorDetails")
              : t("details.reason")}
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
