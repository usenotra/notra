"use client";

import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { DEFAULT_AUTH_PASSWORD_FIELD_LABEL } from "@notra/ui/constants/auth-labels";
import { useState } from "react";
import type { AuthPasswordFieldProps } from "../../../types/auth";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { useUiLabels } from "../ui-labels-provider";
import { AuthFieldError } from "./auth-field-error";

export function AuthPasswordField({
  id,
  label = DEFAULT_AUTH_PASSWORD_FIELD_LABEL,
  value,
  error,
  disabled,
  placeholder,
  autoComplete,
  onBlur,
  onChange,
}: AuthPasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const uiLabels = useUiLabels();

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
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
          aria-label={
            showPassword ? uiLabels.hidePassword : uiLabels.showPassword
          }
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
