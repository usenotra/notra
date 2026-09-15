import { useStore } from "@tanstack/react-form";

import { EVENT_TYPE_ORDER } from "@/constants/event-triggers";
import type { EventTriggerFormSectionProps } from "@/types/automation/event-trigger";

import { EventTypeCard } from "./event-type-card";
import { IgnoreCommitPatternsField } from "./ignore-commit-patterns-field";
import { TriggerSwitchRow } from "./trigger-switch-row";

export function EventTriggerEventSection({
  form,
}: EventTriggerFormSectionProps) {
  const eventType = useStore(form.store, (s) => s.values.eventType);

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Trigger event</h3>
        <p className="text-muted-foreground text-sm">When should this fire?</p>
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
              label="Include pre-releases"
              onCheckedChange={field.handleChange}
              tooltip="When off, releases marked as pre-release on GitHub will not fire this trigger."
            />
          )}
        </form.Field>
      )}
      {eventType === "push" && (
        <form.Field name="ignoreCommitPatternsText">
          {(field) => {
            const error = field.state.meta.errors[0];
            const errorMessage =
              typeof error === "string"
                ? error
                : (error as { message?: string } | undefined)?.message;
            return (
              <IgnoreCommitPatternsField
                errorMessage={errorMessage}
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
