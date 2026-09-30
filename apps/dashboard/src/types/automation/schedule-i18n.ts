import type { useTranslations } from "next-intl";

export type ScheduleFormTranslator = ReturnType<
  typeof useTranslations<"automation.schedules.validation">
>;

export type ScheduleNameTranslator = ReturnType<
  typeof useTranslations<"automation.schedules">
>;

export type EventTriggerFormTranslator = ReturnType<
  typeof useTranslations<"automation.events.validation">
>;
