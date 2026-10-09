"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@notra/ui/components/ui/input-group";
import { Label } from "@notra/ui/components/ui/label";
import { useTranslations } from "use-intl";

import { SITE_NEW_FILE_EXTENSION } from "@/constants/sites";
import type { SiteNewFileNameFieldProps } from "@/types/components/sites";

export function SiteNewFileNameField({
  id,
  folder,
  value,
  onValueChange,
  placeholder,
  slug,
  slugValid,
  exists,
  path,
}: SiteNewFileNameFieldProps) {
  const t = useTranslations("sites.newFile");
  const invalid = (slug.length > 0 && !slugValid) || exists;

  let hint = slug ? t("pathHint", { path }) : t("invalidName");
  if (slug && !slugValid) {
    hint = t("invalidName");
  } else if (exists) {
    hint = t("exists", { path });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-file`}>{t("fileName")}</Label>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>{folder}/</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          aria-describedby={`${id}-hint`}
          aria-invalid={invalid || undefined}
          autoCapitalize="none"
          autoComplete="off"
          id={`${id}-file`}
          onChange={(event) => onValueChange(event.target.value.toLowerCase())}
          placeholder={placeholder}
          spellCheck={false}
          value={value}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupText>{SITE_NEW_FILE_EXTENSION}</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
      <p
        className={
          invalid ? "text-destructive text-xs" : "text-muted-foreground text-xs"
        }
        id={`${id}-hint`}
      >
        {hint}
      </p>
    </div>
  );
}
