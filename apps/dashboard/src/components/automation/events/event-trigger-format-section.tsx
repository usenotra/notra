import { useTranslations } from "use-intl";

import { FormatCard } from "@/components/content/create/format-card";
import { FORMAT_ORDER } from "@/constants/content-formats";
import type { EventTriggerFormSectionProps } from "@/types/automation/event-trigger";

export function EventTriggerFormatSection({
  form,
}: EventTriggerFormSectionProps) {
  const t = useTranslations("automation.schedules.dialog");
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">{t("contentFormat")}</h3>
        <p className="text-muted-foreground text-sm">
          {t("contentFormatHint")}
        </p>
      </div>
      <form.Field name="outputType">
        {(field) => (
          <div className="grid gap-3 md:grid-cols-2">
            {FORMAT_ORDER.map((type) => (
              <FormatCard
                format={type}
                key={type}
                onToggle={() => field.handleChange(type)}
                selected={field.state.value === type}
              />
            ))}
          </div>
        )}
      </form.Field>
    </section>
  );
}
