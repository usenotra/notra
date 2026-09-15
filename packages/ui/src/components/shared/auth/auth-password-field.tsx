"use client";

import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import type { AuthPasswordFieldProps } from "../../../types/auth";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { AuthFieldError } from "./auth-field-error";

export function AuthPasswordField({
  id,
  value,
  error,
  disabled,
  placeholder,
  autoComplete,
  onBlur,
  onChange,
}: AuthPasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>Password</Label>
      <div className="relative">
        <Input
          aria-describedby={`${id}-error`}
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          className="h-11 rounded-xl px-4 pr-10"
          disabled={disabled}
          id={id}
          name={id}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={showPassword ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="-translate-y-1/2 absolute top-1/2 right-4 cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-50"
          disabled={disabled}
          onClick={() => setShowPassword(!showPassword)}
          type="button"
        >
          {showPassword ? (
            <HugeiconsIcon className="size-4" icon={ViewOffSlashIcon} />
          ) : (
            <HugeiconsIcon className="size-4" icon={ViewIcon} />
          )}
        </button>
      </div>
      <AuthFieldError error={error} id={`${id}-error`} />
    </div>
  );
}
