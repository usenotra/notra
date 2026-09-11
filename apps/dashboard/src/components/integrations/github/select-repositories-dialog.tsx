"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@notra/ui/components/shared/responsive-dialog";
import { Field, FieldLabel } from "@notra/ui/components/ui/field";
import type React from "react";
import { isValidElement, useState } from "react";

import { Button } from "@/components/button";
import type { SelectRepositoriesDialogProps } from "@/types/integrations/github";

import { RepositoryMultiSelect } from "./repository-multi-select";

const EMPTY_SELECTED_REPOSITORY_IDS: string[] = [];

export function SelectRepositoriesDialog({
  repositories,
  error,
  onRetry,
  onSave,
  initialSelected = EMPTY_SELECTED_REPOSITORY_IDS,
  isLoading = false,
  isSaving = false,
  accounts,
  selectedAccountId,
  onSelectAccount,
  onAddAccount,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: SelectRepositoriesDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [prevResetInputs, setPrevResetInputs] = useState({
    open,
    initialSelected,
  });

  if (
    prevResetInputs.open !== open ||
    prevResetInputs.initialSelected !== initialSelected
  ) {
    setPrevResetInputs({ open, initialSelected });
    if (open) {
      setSelected(initialSelected);
    }
  }

  const triggerElement =
    trigger && isValidElement(trigger) ? (
      <ResponsiveDialogTrigger render={trigger as React.ReactElement} />
    ) : null;

  return (
    <ResponsiveDialog onOpenChange={setOpen} open={open}>
      {triggerElement}
      <ResponsiveDialogContent className="flex max-h-[85svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[520px] [&>*]:min-w-0">
        <ResponsiveDialogHeader className="shrink-0 p-4 pb-0">
          <ResponsiveDialogTitle>Select repositories</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Save your selection to finish connecting repositories to Notra. Only
            repositories granted to the GitHub App appear here. Existing
            publishing settings will be kept.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4">
          <div className="space-y-3 py-4">
            {error ? (
              <div className="space-y-2">
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
                {onRetry ? (
                  <Button
                    disabled={isLoading}
                    onClick={onRetry}
                    variant="outline"
                  >
                    Retry loading repositories
                  </Button>
                ) : null}
              </div>
            ) : null}
            <Field>
              <FieldLabel>Repositories</FieldLabel>
              <RepositoryMultiSelect
                accounts={accounts}
                isLoading={isLoading}
                onAddAccount={onAddAccount}
                onChange={setSelected}
                onSelectAccount={onSelectAccount}
                repositories={repositories}
                selectedAccountId={selectedAccountId}
                value={selected}
              />
            </Field>
            {onAddAccount ? (
              <button
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                onClick={onAddAccount}
                type="button"
              >
                Missing a repository? Add access on GitHub
                <HugeiconsIcon className="size-3" icon={ArrowUpRight01Icon} />
              </button>
            ) : null}
          </div>
        </div>
        <ResponsiveDialogFooter className="bg-muted/50 mx-0 mb-0 shrink-0 rounded-b-xl border-t p-4">
          <ResponsiveDialogClose
            disabled={isSaving}
            render={<Button variant="outline" />}
          >
            Cancel
          </ResponsiveDialogClose>
          <Button
            disabled={isSaving || isLoading || Boolean(error)}
            onClick={() => onSave(selected)}
          >
            {isSaving ? "Saving…" : "Save repositories"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
