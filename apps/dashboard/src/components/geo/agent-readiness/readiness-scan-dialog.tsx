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
import { useTranslations } from "use-intl";

import type { AgentReadinessScanDialogProps } from "@/types/agent-readiness";

export function AgentReadinessScanDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: AgentReadinessScanDialogProps) {
  const t = useTranslations("geo.agentReadiness.scanDialog");
  const tCommon = useTranslations("common");
  const tActions = useTranslations("common.actions");

  return (
    <ResponsiveAlertDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveAlertDialogContent>
        <ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogTitle>{t("title")}</ResponsiveAlertDialogTitle>
          <ResponsiveAlertDialogDescription>
            {t("body")}
          </ResponsiveAlertDialogDescription>
        </ResponsiveAlertDialogHeader>
        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel disabled={isPending}>
            {tActions("cancel")}
          </ResponsiveAlertDialogCancel>
          <ResponsiveAlertDialogAction disabled={isPending} onClick={onConfirm}>
            {isPending ? tCommon("labels.starting") : t("confirm")}
          </ResponsiveAlertDialogAction>
        </ResponsiveAlertDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  );
}
