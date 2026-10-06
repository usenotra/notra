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
  ResponsiveAlertDialogTrigger,
} from "@notra/ui/components/shared/responsive-alert-dialog";
import { useUiLabels } from "@notra/ui/components/shared/ui-labels-provider";
import type { ConfirmDialogProps } from "@notra/ui/types/confirm-dialog";
import { useState } from "react";

export function ConfirmDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel,
  variant = "default",
  onConfirm,
  pending = false,
  className,
}: ConfirmDialogProps) {
  const labels = useUiLabels();
  const [running, setRunning] = useState(false);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const busy = pending || running;

  function handleOpenChange(nextOpen: boolean) {
    // Keep the dialog up while the action runs so its result stays visible.
    if (busy) {
      return;
    }
    if (open === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }

  async function handleConfirm() {
    const result = onConfirm();
    if (!(result instanceof Promise)) {
      return;
    }
    setRunning(true);
    try {
      await result;
    } finally {
      setRunning(false);
    }
  }

  return (
    <ResponsiveAlertDialog
      onOpenChange={handleOpenChange}
      open={open ?? uncontrolledOpen}
    >
      {trigger ? <ResponsiveAlertDialogTrigger render={trigger} /> : null}
      <ResponsiveAlertDialogContent className={className}>
        <ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogTitle className="wrap-anywhere">
            {title}
          </ResponsiveAlertDialogTitle>
          {description ? (
            <ResponsiveAlertDialogDescription className="wrap-anywhere">
              {description}
            </ResponsiveAlertDialogDescription>
          ) : null}
        </ResponsiveAlertDialogHeader>
        {children}
        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel disabled={busy}>
            {cancelLabel ?? labels.cancel}
          </ResponsiveAlertDialogCancel>
          <ResponsiveAlertDialogAction
            loading={busy}
            onClick={handleConfirm}
            variant={variant}
          >
            {confirmLabel}
          </ResponsiveAlertDialogAction>
        </ResponsiveAlertDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  );
}
