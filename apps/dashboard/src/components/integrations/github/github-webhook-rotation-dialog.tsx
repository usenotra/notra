import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@notra/ui/components/ui/alert-dialog";
import { useTranslations } from "next-intl";

import { Button } from "@/components/button";
import type { GitHubWebhookRotationDialogProps } from "@/types/integrations/github";

export function GitHubWebhookRotationDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: GitHubWebhookRotationDialogProps) {
  const t = useTranslations("integrations.github.rotationDialog");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon = useTranslations("common");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {tCommon("actions.cancel")}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending
              ? tCommon("labels.regenerating")
              : tIntegrationsShared("regenerateSecret")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
