"use client";

import { SITE_SLUG_MAX_LENGTH } from "@notra/sites-core/constants/sites";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@notra/ui/components/ui/input-group";

import type { SiteAddressInputProps } from "@/types/components/sites";

export function SiteAddressInput({
  id,
  value,
  onValueChange,
  invalid,
  placeholder,
  hostingDomain,
  describedBy,
}: SiteAddressInputProps) {
  return (
    <InputGroup>
      <InputGroupInput
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        autoCapitalize="none"
        autoComplete="off"
        id={id}
        maxLength={SITE_SLUG_MAX_LENGTH}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        value={value}
      />
      {hostingDomain ? (
        <InputGroupAddon align="inline-end">
          <InputGroupText>.{hostingDomain}</InputGroupText>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}
