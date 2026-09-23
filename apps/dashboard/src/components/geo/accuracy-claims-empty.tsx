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
import { useState } from "react";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import {
  ACCURACY_ANALYZE_ACTION,
  ACCURACY_ANALYZE_CONFIRM,
  ACCURACY_ANALYZE_CONFIRM_TITLE,
} from "@/constants/geo-accuracy";
import type { AccuracyClaimsEmptyProps } from "@/types/geo-accuracy";

export function AccuracyClaimsEmpty({
  title,
  message,
  canAnalyze,
  retrying,
  analyze,
}: AccuracyClaimsEmptyProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <EmptyState
        action={
          canAnalyze ? (
            <Button onClick={() => setConfirmOpen(true)} type="button">
              {retrying ? "Retry analysis" : ACCURACY_ANALYZE_ACTION}
            </Button>
          ) : undefined
        }
        description={message}
        preview={
          <EmptyStateTablePreview
            columns={EMPTY_STATE_TABLE_COLUMNS.prompts}
            rows={EMPTY_STATE_TABLE_ROWS}
          />
        }
        title={title}
      />
      <ResponsiveAlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>
              {ACCURACY_ANALYZE_CONFIRM_TITLE}
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              {ACCURACY_ANALYZE_CONFIRM}
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <p className="text-muted-foreground text-sm">
            An AI attempt may still use credits if it fails or finds no claims.
          </p>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel>Cancel</ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                analyze();
              }}
            >
              Confirm and analyze
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </>
  );
}
