"use client";

import { WebDesign01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";

export function SitesUnavailableState() {
  const t = useTranslations("sites.unavailable");
  return (
    <div className="border-border mx-auto flex w-full max-w-xl flex-col items-center gap-3 rounded-xl border p-8 text-center">
      <span className="border-border inline-flex size-11 items-center justify-center rounded-2xl border">
        <HugeiconsIcon className="size-5" icon={WebDesign01Icon} />
      </span>
      <h2 className="text-xl font-semibold tracking-tight">{t("title")}</h2>
      <p className="text-muted-foreground text-sm text-balance">
        {t("description")}
      </p>
    </div>
  );
}
