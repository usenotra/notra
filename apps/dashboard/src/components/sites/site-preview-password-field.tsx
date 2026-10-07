"use client";

import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SITE_PREVIEW_PASSWORD_MAX_LENGTH,
  SITE_PREVIEW_PASSWORD_MIN_LENGTH,
} from "@notra/sites-core/constants/sites";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@notra/ui/components/ui/input-group";
import { Label } from "@notra/ui/components/ui/label";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { SiteRelativeTime } from "@/components/sites/site-relative-time";
import type { SitePreviewPasswordFieldProps } from "@/types/components/site-preview-access";

export function SitePreviewPasswordField({
  idPrefix: id,
  passwordSetAt,
  editing,
  onEdit,
  value: password,
  onChange,
  tooShort,
  showPassword,
  onToggleShowPassword,
}: SitePreviewPasswordFieldProps) {
  const t = useTranslations("sites.previewAccess");
  const hasPassword = Boolean(passwordSetAt);

  if (!editing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
          <p className="text-muted-foreground min-w-0 text-sm">
            {t.rich("passwordSet", {
              time: () =>
                passwordSetAt ? (
                  <SiteRelativeTime date={passwordSetAt} inline />
                ) : null,
            })}
          </p>
          <Button onClick={onEdit} size="sm" type="button" variant="outline">
            {t("changePassword")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-password-input`}>
        {hasPassword ? t("newPasswordLabel") : t("passwordLabel")}
      </Label>
      <InputGroup>
        <InputGroupInput
          aria-describedby={`${id}-password-hint`}
          aria-invalid={tooShort && password.length > 0}
          autoComplete="new-password"
          autoFocus
          id={`${id}-password-input`}
          maxLength={SITE_PREVIEW_PASSWORD_MAX_LENGTH}
          minLength={SITE_PREVIEW_PASSWORD_MIN_LENGTH}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          type={showPassword ? "text" : "password"}
          value={password}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            onClick={onToggleShowPassword}
            size="icon-xs"
          >
            <HugeiconsIcon
              icon={showPassword ? ViewOffIcon : ViewIcon}
              strokeWidth={1.5}
            />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <p
        className="text-muted-foreground text-xs text-pretty"
        id={`${id}-password-hint`}
      >
        {hasPassword
          ? t("changeHint", { min: SITE_PREVIEW_PASSWORD_MIN_LENGTH })
          : t("passwordHint", { min: SITE_PREVIEW_PASSWORD_MIN_LENGTH })}
      </p>
    </div>
  );
}
