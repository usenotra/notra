"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from "@notra/ui/components/ui/autocomplete";

import type { SiteSuggestInputProps } from "@/types/components/sites";

export function SiteSuggestInput({
  id,
  value,
  onValueChange,
  suggestions,
  icon,
  placeholder,
  emptyLabel,
  invalid = false,
  describedBy,
}: SiteSuggestInputProps) {
  return (
    <Autocomplete
      items={suggestions}
      onValueChange={onValueChange}
      openOnInputClick
      value={value}
    >
      <AutocompleteInput
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        id={id}
        placeholder={placeholder}
        spellCheck={false}
      />
      {suggestions.length > 0 ? (
        <AutocompleteContent>
          <AutocompleteEmpty>{emptyLabel}</AutocompleteEmpty>
          <AutocompleteList>
            {(suggestion: string) => (
              <AutocompleteItem key={suggestion} value={suggestion}>
                <HugeiconsIcon
                  aria-hidden="true"
                  className="text-muted-foreground"
                  icon={icon}
                  strokeWidth={1.5}
                />
                <span className="truncate font-mono text-xs">{suggestion}</span>
              </AutocompleteItem>
            )}
          </AutocompleteList>
        </AutocompleteContent>
      ) : null}
    </Autocomplete>
  );
}
