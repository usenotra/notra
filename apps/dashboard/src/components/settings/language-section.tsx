"use client";

import { Label } from "@notra/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useTranslations } from "next-intl";

import { DASHBOARD_LOCALE_OPTIONS } from "@/constants/locales";
import { useLocalePreference } from "@/lib/hooks/use-locale-preference";
import { isDashboardLocale } from "@/utils/i18n";

export function LanguageSection() {
  const t = useTranslations("settings.language");
  const tCommon = useTranslations("common");
  const { locale, isUpdating, setLocale } = useLocalePreference();

  return (
    <TitleCard className="lg:col-span-2" heading={tCommon("labels.language")}>
      <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
        <div className="min-w-0 space-y-1">
          <Label className="text-sm font-medium" htmlFor="dashboard-language">
            {t("label")}
          </Label>
          <p className="text-muted-foreground text-xs">{t("description")}</p>
        </div>
        <Select
          disabled={isUpdating}
          items={DASHBOARD_LOCALE_OPTIONS}
          onValueChange={(value) => {
            if (isDashboardLocale(value) && value !== locale) {
              setLocale(value);
            }
          }}
          value={locale}
        >
          <SelectTrigger className="min-w-40" id="dashboard-language">
            <SelectValue>
              {(value) => {
                const option = DASHBOARD_LOCALE_OPTIONS.find(
                  (item) => item.value === value
                );
                return option ? (
                  <>
                    <span aria-hidden="true" className="text-base leading-none">
                      {option.flag}
                    </span>
                    <span>{option.label}</span>
                  </>
                ) : null;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {DASHBOARD_LOCALE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span aria-hidden="true" className="text-base leading-none">
                  {option.flag}
                </span>
                <span>{option.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </TitleCard>
  );
}
