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

import type { GeoRemoveDialogProps } from "@/types/geo";

function confirmLabel(
  isPending: boolean,
  isBulk: boolean,
  nouns: GeoRemoveDialogProps["nouns"]
): string {
  if (isPending) {
    return "Removing…";
  }
  if (isBulk) {
    return `Remove ${nouns.plural}`;
  }
  return `Remove ${nouns.singular}`;
}

function titleLabel(
  count: number,
  nouns: GeoRemoveDialogProps["nouns"]
): string {
  if (count > 1) {
    return `Remove ${count} ${nouns.plural}?`;
  }
  return `Remove ${nouns.singular}?`;
}

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
  const isBulk = items.length > 1;
  const descriptionText =
    typeof description === "function" ? description(items) : description;

  return (
    <ResponsiveAlertDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveAlertDialogContent>
        <ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogTitle>
            {title ?? titleLabel(items.length, nouns)}
          </ResponsiveAlertDialogTitle>
          <ResponsiveAlertDialogDescription>
            {descriptionText}
          </ResponsiveAlertDialogDescription>
        </ResponsiveAlertDialogHeader>
        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel disabled={isPending}>
            Cancel
          </ResponsiveAlertDialogCancel>
          <ResponsiveAlertDialogAction
            disabled={isPending}
            onClick={onConfirm}
            variant={destructive ? "destructive" : "default"}
          >
            {isPending
              ? (pendingLabel ?? confirmLabel(true, isBulk, nouns))
              : (actionLabel ?? confirmLabel(false, isBulk, nouns))}
          </ResponsiveAlertDialogAction>
        </ResponsiveAlertDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  );
}
