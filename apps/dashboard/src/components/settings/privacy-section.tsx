"use client";

import { Label } from "@notra/ui/components/ui/label";
import { Switch } from "@notra/ui/components/ui/switch";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useTranslations } from "next-intl";

import { useHidePersonalData } from "@/lib/hooks/use-privacy-preferences";

export function PrivacySection() {
  const t = useTranslations("settings.privacy");
  const { hidePersonalData, hasHydrated, isUpdating, setHidePersonalData } =
    useHidePersonalData();

  return (
    <TitleCard className="lg:col-span-2" heading={t("heading")}>
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">{t("description")}</p>

        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="min-w-0 space-y-1">
            <Label
              className="cursor-pointer text-sm font-medium"
              htmlFor="hide-personal-data"
            >
              {t("hidePersonalData")}
            </Label>
            <p className="text-muted-foreground text-xs">
              {t("hidePersonalDataDescription")}
            </p>
          </div>
          <Switch
            checked={hidePersonalData}
            disabled={!hasHydrated || isUpdating}
            id="hide-personal-data"
            onCheckedChange={setHidePersonalData}
          />
        </div>
      </div>
    </TitleCard>
  );
}
