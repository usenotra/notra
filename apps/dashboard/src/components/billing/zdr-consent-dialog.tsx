"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { useTranslations } from "next-intl";

import { Button } from "@/components/button";
import { ZDR_CONSENT_POINT_KEYS } from "@/constants/billing-zdr";
import type { ZdrConsentDialogProps } from "@/types/billing/plan";

export function ZdrConsentDialog({
  open,
  onOpenChange,
  onConfirm,
}: ZdrConsentDialogProps) {
  const t = useTranslations("billing.zdrConsent");
  const tCommon = useTranslations("common");
  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("title")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{t("body")}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm">
          {ZDR_CONSENT_POINT_KEYS.map((point) => (
            <li key={point}>{t(`points.${point}`)}</li>
          ))}
        </ul>
        <p className="text-muted-foreground text-xs">{t("footnote")}</p>
        <ResponsiveDialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            {t("cancel")}
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {tCommon("actions.enable")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
