"use client";

import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useTranslations } from "next-intl";

import { Button } from "@/components/button";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";

export function DeleteAccountSection() {
  const t = useTranslations("settings.deleteAccount");
  const tCommon = useTranslations("common");

  return (
    <TitleCard
      className="border-destructive/50 bg-destructive/5 lg:col-span-2"
      heading={tCommon("labels.deleteAccount")}
    >
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          {t("sectionDescription")}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <DeleteAccountDialog
            trigger={
              <Button className="w-full sm:w-auto" variant="destructive">
                {t("deletePersonalAccount")}
              </Button>
            }
          />
        </div>
      </div>
    </TitleCard>
  );
}
