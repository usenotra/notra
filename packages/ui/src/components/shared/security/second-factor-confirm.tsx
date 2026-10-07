"use client";


import { DEFAULT_SECOND_FACTOR_CONFIRM_LABELS } from "@notra/ui/constants/security-labels";
import { useId, useState } from "react";

import type {
  SecondFactorConfirmProps,
  SecurityActionOutcome,
} from "../../../types/security";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";

export function SecondFactorConfirm({
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
  labels,
}: SecondFactorConfirmProps) {
  const l = { ...DEFAULT_SECOND_FACTOR_CONFIRM_LABELS, ...labels };
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function submit() {
    if (isPending || code.trim().length === 0) {
      return;
    }
    setError(null);
    setIsPending(true);
    const result = await onConfirm(code).catch(
      (): SecurityActionOutcome => ({
        ok: false,
        message: l.errorFallback,
      })
    );
    setIsPending(false);
    if (!result.ok) {
      setError(result.message || l.errorFallback);
      setCode("");
    }
  }

  return (
    <form
      aria-busy={isPending}
      className="grid gap-4 rounded-lg border bg-muted/30 p-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-1">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={inputId}>{l.codeLabel}</Label>
        <Input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          autoCapitalize="off"
          autoComplete="one-time-code"
          autoFocus
          className="font-mono tracking-wider"
          disabled={isPending}
          id={inputId}
          inputMode="text"
          onChange={(event) => setCode(event.target.value)}
          placeholder={l.codePlaceholder}
          spellCheck={false}
          value={code}
        />
        {error && (
          <p className="text-destructive text-xs" id={errorId} role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          disabled={isPending}
          onClick={onCancel}
          type="button"
          variant="ghost"
        >
          {l.cancel}
        </Button>
        <Button
          disabled={code.trim().length === 0}
          loading={isPending}
          type="submit"
          variant={destructive ? "destructive" : "default"}
        >
          {confirmLabel}
        </Button>
      </div>
    </form>
  );
}
