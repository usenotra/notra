"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import { useId, useState } from "react";

import { Button } from "@/components/button";
import type { GitHubCreateBranchFormProps } from "@/types/integrations/github";

export function GitHubCreateBranchForm({
  baseBranch,
  errorMessage,
  isPending,
  onCancel,
  onChange,
  onSubmit,
}: GitHubCreateBranchFormProps) {
  const [branchName, setBranchName] = useState("");
  const branchNameId = useId();

  return (
    <form
      className="flex h-full flex-col gap-4 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const normalizedBranchName = branchName.trim();
        if (normalizedBranchName) {
          onSubmit(normalizedBranchName);
        }
      }}
    >
      <div className="flex items-center gap-2">
        <Button
          aria-label="Back to branches"
          disabled={isPending}
          onClick={onCancel}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <HugeiconsIcon className="size-4" icon={ArrowLeft01Icon} />
        </Button>
        <p className="text-sm font-medium">Create branch</p>
      </div>
      <Field data-invalid={errorMessage ? true : undefined}>
        <FieldLabel htmlFor={branchNameId}>Branch name</FieldLabel>
        <Input
          aria-describedby={`${branchNameId}-description${errorMessage ? ` ${branchNameId}-error` : ""}`}
          aria-invalid={Boolean(errorMessage)}
          autoFocus
          disabled={isPending}
          id={branchNameId}
          onChange={(event) => {
            setBranchName(event.target.value);
            if (errorMessage) {
              onChange();
            }
          }}
          placeholder="feature/new-content"
          value={branchName}
        />
        <FieldDescription id={`${branchNameId}-description`}>
          Created from {baseBranch} and selected for publishing.
        </FieldDescription>
        {errorMessage ? (
          <p
            className="text-destructive text-xs"
            id={`${branchNameId}-error`}
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
      </Field>
      <div className="mt-auto flex justify-between gap-2">
        <Button
          disabled={isPending}
          onClick={onCancel}
          size="sm"
          type="button"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button
          disabled={isPending || !branchName.trim()}
          size="sm"
          type="submit"
        >
          {isPending ? "Creating…" : "Create branch"}
        </Button>
      </div>
    </form>
  );
}
