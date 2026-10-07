import { useTranslations } from "use-intl";

import {
  LOG_CONTEXT_ALIASES,
  LOG_CONTEXT_FIELD_COMMON_LABEL_KEYS,
  LOG_CONTEXT_FIELD_KEYS,
} from "@/constants/logs";
import type { LogEntryProps } from "@/types/logs/details-sheet";
import { hasOwnKey } from "@/utils/has-own-key";

export function LogTechnicalDetails({ entry }: LogEntryProps) {
  const t = useTranslations("logs.details");
  const tLabels = useTranslations("common.labels");
  const payload = entry.payload;
  const contextFields = LOG_CONTEXT_FIELD_KEYS.flatMap((key) => {
    const value = payload?.[key] ?? payload?.[LOG_CONTEXT_ALIASES[key] ?? key];
    return typeof value === "string" || typeof value === "number"
      ? [
          {
            key,
            label: hasOwnKey(LOG_CONTEXT_FIELD_COMMON_LABEL_KEYS, key)
              ? tLabels(LOG_CONTEXT_FIELD_COMMON_LABEL_KEYS[key])
              : t(`contextFields.${key}`),
            value: String(value),
          },
        ]
      : [];
  });
  return (
    <>
      {contextFields.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-medium">{t("runContext")}</h3>
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
        <h3 className="text-sm font-medium">{t("eventMetadata")}</h3>
        <dl className="space-y-3 text-xs">
          <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
            <dt className="text-muted-foreground">{t("logId")}</dt>
            <dd className="font-mono break-all">{entry.id}</dd>
          </div>
          <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
            <dt className="text-muted-foreground">{t("timestamp")}</dt>
            <dd className="font-mono break-all">{entry.createdAt}</dd>
          </div>
          {entry.integrationId ? (
            <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
              <dt className="text-muted-foreground">{t("sourceId")}</dt>
              <dd className="font-mono break-all">{entry.integrationId}</dd>
            </div>
          ) : null}
          {entry.referenceId ? (
            <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
              <dt className="text-muted-foreground">{t("referenceId")}</dt>
              <dd className="font-mono break-all">{entry.referenceId}</dd>
            </div>
          ) : null}
        </dl>
      </section>
      {payload && Object.keys(payload).length > 0 ? (
        <details className="space-y-3">
          <summary className="focus-visible:outline-ring cursor-pointer text-sm font-medium focus-visible:outline-2">
            {t("rawPayload")}
          </summary>
          <pre className="bg-muted/30 max-h-80 overflow-auto rounded-xl p-4 font-mono text-xs leading-relaxed">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </details>
      ) : null}
    </>
  );
}
