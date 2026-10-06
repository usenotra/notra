"use client";

import { ConfirmDialog } from "@notra/ui/components/shared/confirm-dialog";
import { useTranslations } from "use-intl";

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
  title,
}: GeoRemoveDialogProps) {
  const t = useTranslations("geo.geoRemoveDialog");
  const isBulk = items.length > 1;
  const noun = isBulk ? nouns.plural : nouns.singular;
  const defaultTitle = isBulk
    ? t("titleBulk", { count: items.length, noun: nouns.plural })
    : t("title", { noun: nouns.singular });
  const descriptionText =
    typeof description === "function" ? description(items) : description;

  return (
    <ConfirmDialog
      confirmLabel={actionLabel ?? t("confirm", { noun })}
      description={descriptionText}
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
      open={open}
      pending={isPending}
      title={title ?? defaultTitle}
      variant={destructive ? "destructive" : "default"}
    />
  );
}
