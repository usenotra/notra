import type { ReactElement, ReactNode } from "react";

export interface ConfirmDialogProps {
  /** Controlled open state. Leave out to let a `trigger` open the dialog. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the dialog, e.g. a `<Button />`. */
  trigger?: ReactElement;
  title: ReactNode;
  description?: ReactNode;
  /** Extra body content between the header and the footer. */
  children?: ReactNode;
  confirmLabel: ReactNode;
  /** Defaults to the `cancel` UI label. */
  cancelLabel?: ReactNode;
  variant?: "default" | "destructive";
  /**
   * Runs when the confirm button is pressed. A returned promise shows the
   * loading state until it settles. Closing the dialog is up to the owner.
   */
  onConfirm: () => void | Promise<unknown>;
  /** Shows the loading state for work the owner tracks itself. */
  pending?: boolean;
  /** Class for the dialog content, e.g. a max width. */
  className?: string;
}
