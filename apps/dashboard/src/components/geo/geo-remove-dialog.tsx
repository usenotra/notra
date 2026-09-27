"use client";

import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@notra/ui/components/shared/responsive-alert-dialog";
import { useTranslations } from "next-intl";

import type { GeoRemoveDialogProps } from "@/types/geo";

export function GeoRemoveDialog({
  open,
  onOpenChange,
  items,
  onConfirm,
  isPending,
  nouns,
  description,
  actionLabel,
  destructive = true,
  pendingLabel,
  title,
}: GeoRemoveDialogProps) {
  const t = useTranslations("geo.geoRemoveDialog");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  const isBulk = items.length > 1;
  const noun = isBulk ? nouns.plural : nouns.singular;
  const defaultTitle = isBulk
    ? t("titleBulk", { count: items.length, noun: nouns.plural })
    : t("title", { noun: nouns.singular });
  const descriptionText =
    typeof description === "function" ? description(items) : description;

  return (
    <ResponsiveAlertDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveAlertDialogContent>
        <ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogTitle>
            {title ?? defaultTitle}
          </ResponsiveAlertDialogTitle>
          <ResponsiveAlertDialogDescription>
            {descriptionText}
          </ResponsiveAlertDialogDescription>
        </ResponsiveAlertDialogHeader>
        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel disabled={isPending}>
            {tCommon("cancel")}
          </ResponsiveAlertDialogCancel>
          <ResponsiveAlertDialogAction
            disabled={isPending}
            onClick={onConfirm}
            variant={destructive ? "destructive" : "default"}
          >
            {isPending
              ? (pendingLabel ?? tCommon2("labels.removing"))
              : (actionLabel ?? t("confirm", { noun }))}
          </ResponsiveAlertDialogAction>
        </ResponsiveAlertDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  );
}
