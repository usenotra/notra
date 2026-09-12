"use client";

import type { AffectedTrigger } from "@notra/schemas/dashboard/integrations";
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
import { Input } from "@notra/ui/components/ui/input";
import { useState } from "react";

import { AffectedTriggersWarning } from "@/components/affected-triggers-warning";

interface DeleteIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integrationName: string;
  affectedSchedules: AffectedTrigger[];
  isLoadingSchedules: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
}

export function DeleteIntegrationDialog({
  open,
  onOpenChange,
  integrationName,
  affectedSchedules,
  isLoadingSchedules,
  isDeleting,
  onConfirm,
}: DeleteIntegrationDialogProps) {
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const isDeleteConfirmMatch = deleteConfirmation.trim() === integrationName;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setDeleteConfirmation("");
    }
    onOpenChange(newOpen);
  };

  const handleConfirm = () => {
    onConfirm();
    setDeleteConfirmation("");
  };

  return (
    <ResponsiveAlertDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveAlertDialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-[520px] [&>*]:min-w-0">
        <ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogTitle className="text-lg">
            Delete {integrationName}?
          </ResponsiveAlertDialogTitle>
          <ResponsiveAlertDialogDescription>
            This action permanently removes the integration and all connected
            metadata. Type{" "}
            <span className="font-semibold">{integrationName}</span> to confirm.
          </ResponsiveAlertDialogDescription>
        </ResponsiveAlertDialogHeader>

        <AffectedTriggersWarning
          events={[]}
          isLoading={isLoadingSchedules}
          resourceLabel="integration"
          schedules={affectedSchedules}
        />

        <div className="space-y-2">
          <Input
            aria-label="Confirm integration deletion"
            autoComplete="off"
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            placeholder={integrationName}
            value={deleteConfirmation}
          />
          <p className="text-muted-foreground text-xs">
            Deletion is permanent and cannot be undone.
          </p>
        </div>
        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel
            disabled={isDeleting}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </ResponsiveAlertDialogCancel>
          <ResponsiveAlertDialogAction
            disabled={isDeleting || !isDeleteConfirmMatch}
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
            type="button"
            variant="destructive"
          >
            {isDeleting ? "Deleting…" : "Delete integration"}
          </ResponsiveAlertDialogAction>
        </ResponsiveAlertDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  );
}
