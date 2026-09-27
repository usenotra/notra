"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Field, FieldLabel } from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("integrations.github.createBranch");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon = useTranslations("common");
  const [branchName, setBranchName] = useState("");
  const branchNameId = useId();
  const descriptionId = `${branchNameId}-description`;

  return (
    <form
      aria-label={t("formAriaLabel", { branch: baseBranch })}
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
          aria-label={t("back")}
          disabled={isPending}
          onClick={onCancel}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <HugeiconsIcon className="size-4" icon={ArrowLeft01Icon} />
        </Button>
        <p className="text-sm font-medium">
          {tIntegrationsShared("createBranch")}
        </p>
      </div>
      <Field data-invalid={errorMessage ? true : undefined}>
        <FieldLabel htmlFor={branchNameId}>{t("branchName")}</FieldLabel>
        <Input
          aria-describedby={
            errorMessage
              ? `${descriptionId} ${branchNameId}-error`
              : descriptionId
          }
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
        <p className="sr-only" id={descriptionId}>
          {t("description", { branch: baseBranch })}
        </p>
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
          {tCommon("actions.cancel")}
        </Button>
        <Button
          disabled={isPending || !branchName.trim()}
          size="sm"
          type="submit"
        >
          {isPending
            ? tCommon("actions.creating")
            : tIntegrationsShared("createBranch")}
        </Button>
      </div>
    </form>
  );
}
