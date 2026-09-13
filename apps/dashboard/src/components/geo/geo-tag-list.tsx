"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  addUniqueValues,
  LINE_BREAK_REGEX,
  removeValue,
} from "@notra/geo-core/geo/string-list";
import { Badge } from "@notra/ui/components/ui/badge";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { useState } from "react";

import type { GeoTagListProps } from "@/types/geo";

export function GeoTagList({
  id,
  label,
  description,
  values,
  onChange,
  placeholder,
  max,
  disabled = false,
  labeled = true,
  inputClassName,
  inline = false,
}: GeoTagListProps) {
  const [draft, setDraft] = useState("");
  const atLimit = values.length >= max;

  const commitDraft = () => {
    if (disabled) {
      return;
    }
    if (atLimit) {
      setDraft("");
      return;
    }
    const next = addUniqueValues(values, draft, max);
    if (next !== values) {
      onChange(next);
    }
    setDraft("");
  };

  const badges =
    values.length > 0 ? (
      <div
        className={inline ? "contents" : "flex flex-wrap items-center gap-1.5"}
      >
        {values.map((value) => (
          <Badge
            className="h-7 max-w-full gap-1 pr-1 text-xs"
            key={value}
            variant="secondary"
          >
            <span className="truncate">{value}</span>
            <button
              aria-label={`Remove ${value}`}
              className="hover:bg-background focus-visible:ring-ring flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 disabled:cursor-not-allowed"
              disabled={disabled}
              onClick={() => onChange(removeValue(values, value))}
              type="button"
            >
              <HugeiconsIcon aria-hidden="true" icon={Cancel01Icon} size={12} />
            </button>
          </Badge>
        ))}
      </div>
    ) : null;

  return (
    <div
      className={
        inline
          ? "bg-background focus-within:border-ring focus-within:ring-ring/50 flex min-h-10 w-full min-w-0 flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1.5 focus-within:ring-2"
          : "w-full min-w-0 space-y-2"
      }
    >
      {labeled ? (
        <div className="w-full space-y-1">
          <Label className="flex items-center gap-2" htmlFor={id}>
            {label}
            <span className="text-muted-foreground font-normal tabular-nums">
              {values.length}/{max}
            </span>
          </Label>
          {description ? (
            <p className="text-muted-foreground text-xs">{description}</p>
          ) : null}
        </div>
      ) : null}
      {inline ? badges : null}
      <Input
        aria-label={labeled ? undefined : label}
        className={inputClassName}
        disabled={atLimit}
        readOnly={disabled}
        id={id}
        onBlur={commitDraft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (disabled) {
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            commitDraft();
          }
          if (event.key === "Escape") {
            event.stopPropagation();
            setDraft("");
          }
          if (
            event.key === "Backspace" &&
            draft.length === 0 &&
            values.length > 0
          ) {
            onChange(values.slice(0, -1));
          }
        }}
        onPaste={(event) => {
          if (disabled) {
            return;
          }
          const text = event.clipboardData.getData("text");
          if (!LINE_BREAK_REGEX.test(text)) {
            return;
          }
          event.preventDefault();
          onChange(addUniqueValues(values, `${draft}${text}`, max));
          setDraft("");
        }}
        placeholder={atLimit ? undefined : placeholder}
        value={draft}
      />
      {!inline ? badges : null}
    </div>
  );
}
