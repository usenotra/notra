import type { DASHBOARD_LOCALES } from "@notra/schemas/constants/dashboard/locales";
import type { useTranslations } from "next-intl";

import type messages from "../../messages/en.json";

export type DashboardLocale = (typeof DASHBOARD_LOCALES)[number];

export interface DashboardLocaleOption {
  value: DashboardLocale;
  label: string;
  flag: string;
}

export type CommonTranslator = ReturnType<typeof useTranslations<"common">>;

export type CommonLabelsTranslator = ReturnType<
  typeof useTranslations<"common.labels">
>;

export type CommonLabelKey = keyof (typeof messages)["common"]["labels"];

export type MessageLeafKey<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : `${K}.${MessageLeafKey<T[K]>}`;
}[keyof T & string];
