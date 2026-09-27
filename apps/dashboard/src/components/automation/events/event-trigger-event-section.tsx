import { useStore } from "@tanstack/react-form";
import { useTranslations } from "next-intl";

import { EVENT_TYPE_ORDER } from "@/constants/event-triggers";
import type { EventTriggerFormSectionProps } from "@/types/automation/event-trigger";

import { EventTypeCard } from "./event-type-card";
import { IgnoreCommitPatternsField } from "./ignore-commit-patterns-field";
import { TriggerSwitchRow } from "./trigger-switch-row";

export function EventTriggerEventSection({
  form,
}: EventTriggerFormSectionProps) {
  const t = useTranslations("automation.events.dialog");
  const eventType = useStore(form.store, (s) => s.values.eventType);

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">{t("triggerEvent")}</h3>
        <p className="text-muted-foreground text-sm">{t("triggerEventHint")}</p>
      </div>
      <form.Field name="eventType">
        {(field) => (
          <div className="grid gap-3 md:grid-cols-2">
            {EVENT_TYPE_ORDER.map((type) => (
              <EventTypeCard
                eventType={type}
                key={type}
                onSelect={() => field.handleChange(type)}
                selected={field.state.value === type}
              />
            ))}
          </div>
        )}
      </form.Field>
      {eventType === "release" && (
        <form.Field name="includePreReleases">
          {(field) => (
            <TriggerSwitchRow
              checked={field.state.value}
              id={field.name}
              label={t("includePreReleases")}
              onCheckedChange={field.handleChange}
              tooltip={t("includePreReleasesHint")}
            />
          )}
        </form.Field>
      )}
      {eventType === "push" && (
        <form.Field name="ignoreCommitPatternsText">
          {(field) => {
            return (
              <IgnoreCommitPatternsField
                errors={field.state.meta.errors}
                fieldName={field.name}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
                value={field.state.value}
              />
            );
          }}
        </form.Field>
      )}
    </section>
  );
}
