"use client";

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
        maxLength={40}
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
