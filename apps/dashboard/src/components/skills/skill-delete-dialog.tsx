"use client";

import { ConfirmDialog } from "@notra/ui/components/shared/confirm-dialog";
import { useTranslations } from "use-intl";

import type { SkillDeleteDialogProps } from "@/types/skills/page";

export function SkillDeleteDialog({
  open,
  name,
  pending,
  onOpenChange,
  onConfirm,
}: SkillDeleteDialogProps) {
  const t = useTranslations("skills.delete");
  return (
    <ConfirmDialog
      confirmLabel={t("confirm")}
      description={t("description", { name })}
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
      open={open}
      pending={pending}
      title={t("title")}
      variant="destructive"
    />
  );
}
