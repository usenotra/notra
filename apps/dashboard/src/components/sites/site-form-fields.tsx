"use client";

import { Badge } from "@notra/ui/components/ui/badge";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@notra/ui/components/ui/field";
import {
  RadioGroup,
  RadioGroupItem,
} from "@notra/ui/components/ui/radio-group";
import { useId } from "react";

import { cn } from "@/lib/utils";
import type { SiteChoiceGroupProps } from "@/types/components/sites";

export function SiteChoiceGroup<T extends string>({
  label,
  value,
  options,
  onValueChange,
  disabled = false,
  hideLabel = false,
}: SiteChoiceGroupProps<T>) {
  const id = useId();
  return (
    <div className="space-y-2">
      <p
        className={cn("text-sm font-medium", hideLabel && "sr-only")}
        id={`${id}-label`}
      >
        {label}
      </p>
      <RadioGroup
        aria-labelledby={`${id}-label`}
        className="sm:grid-cols-2"
        disabled={disabled}
        onValueChange={(next) => {
          const option = options.find((candidate) => candidate.value === next);
          if (option && !option.disabled) {
            onValueChange(option.value);
          }
        }}
        value={value}
      >
        {options.map((option) => (
          <FieldLabel htmlFor={`${id}-${option.value}`} key={option.value}>
            <Field data-disabled={option.disabled} orientation="horizontal">
              <FieldContent>
                <FieldTitle>
                  {option.title}
                  {option.badge ? (
                    <Badge size="sm" variant="secondary">
                      {option.badge}
                    </Badge>
                  ) : null}
                </FieldTitle>
                <FieldDescription>{option.description}</FieldDescription>
              </FieldContent>
              <RadioGroupItem
                disabled={option.disabled}
                id={`${id}-${option.value}`}
                value={option.value}
              />
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>
    </div>
  );
}
