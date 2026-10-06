"use client";

import { ConfirmDialog } from "@notra/ui/components/shared/confirm-dialog";
import { useTranslations } from "use-intl";

import type { AgentReadinessScanDialogProps } from "@/types/agent-readiness";

export function AgentReadinessScanDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: AgentReadinessScanDialogProps) {
  const t = useTranslations("geo.agentReadiness.scanDialog");

  return (
    <ConfirmDialog
      confirmLabel={t("confirm")}
      description={t("body")}
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
      open={open}
      pending={isPending}
      title={t("title")}
    />
  );
}
