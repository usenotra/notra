"use client";


import { Loader2Icon } from "lucide-react";
import { useId, useState } from "react";

import type { SecondFactorConfirmProps } from "../../../types/security";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";

const CONFIRM_ERROR_FALLBACK = "That code didn't work. Please try again.";

export function SecondFactorConfirm({
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: SecondFactorConfirmProps) {
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
    const result = await onConfirm(code).catch(() => ({
      ok: false as const,
      message: CONFIRM_ERROR_FALLBACK,
    }));
    setIsPending(false);
    if (!result.ok) {
      setError(result.message || CONFIRM_ERROR_FALLBACK);
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
        <Label htmlFor={inputId}>Authenticator or backup code</Label>
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
          placeholder="123456 or xxxx-xxxx"
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
          Cancel
        </Button>
        <Button
          disabled={isPending || code.trim().length === 0}
          type="submit"
          variant={destructive ? "destructive" : "default"}
        >
          {isPending && (
            <Loader2Icon className="animate-spin" />
          )}
          {confirmLabel}
        </Button>
      </div>
    </form>
  );
}
