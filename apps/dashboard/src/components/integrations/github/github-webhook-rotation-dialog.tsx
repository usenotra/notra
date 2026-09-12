import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@notra/ui/components/ui/alert-dialog";

import { Button } from "@/components/button";
import type { GitHubWebhookRotationDialogProps } from "@/types/integrations/github";

export function GitHubWebhookRotationDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: GitHubWebhookRotationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Regenerate webhook secret?</AlertDialogTitle>
          <AlertDialogDescription>
            The current secret will stop working immediately. Webhook deliveries
            will fail until you copy the new secret into GitHub.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? "Regenerating…" : "Regenerate secret"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
