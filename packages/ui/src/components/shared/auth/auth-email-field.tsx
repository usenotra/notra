"use client";

import type { AuthEmailFieldProps } from "../../../types/auth";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { AuthFieldError } from "./auth-field-error";

export function AuthEmailField({
  id,
  label,
  value,
  error,
  disabled,
  placeholder,
  onBlur,
  onChange,
}: AuthEmailFieldProps) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        aria-describedby={`${id}-error`}
        aria-invalid={Boolean(error)}
        autoComplete="email"
        className="h-11 rounded-xl px-4"
        disabled={disabled}
        id={id}
        name={id}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="email"
        value={value}
      />
      <AuthFieldError error={error} id={`${id}-error`} />
    </div>
  );
}
