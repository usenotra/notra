"use client";

import { cn } from "@notra/ui/lib/utils";
import type { TotpCodeInputProps } from "../../../lib/auth-types";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../../ui/input-otp";
import { Label } from "../../ui/label";
import { AuthFieldError } from "./auth-field-error";

export const TOTP_CODE_LENGTH = 6;

const SLOT_INDEXES = [0, 1, 2, 3, 4, 5] as const;

export function TotpCodeInput({
  id,
  value,
  onChange,
  onComplete,
  label = "Verification code",
  error,
  disabled = false,
  autoFocus = false,
  className,
}: TotpCodeInputProps) {
  const errorId = `${id}-error`;
  const hasError = Boolean(error);

  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <InputOTP
        autoComplete="one-time-code"
        className="justify-center"
        disabled={disabled}
        id={id}
        inputMode="numeric"
        length={TOTP_CODE_LENGTH}
        onValueChange={onChange}
        onValueComplete={onComplete}
        validationType="numeric"
        value={value}
      >
        <InputOTPGroup>
          {SLOT_INDEXES.map((index) => (
            <InputOTPSlot
              aria-describedby={errorId}
              aria-invalid={hasError}
              autoFocus={autoFocus && index === 0}
              key={index}
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
      <AuthFieldError error={error ?? undefined} id={errorId} />
    </div>
  );
}
