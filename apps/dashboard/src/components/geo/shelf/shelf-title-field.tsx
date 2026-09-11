"use client";

import { GEO_SHELF_TITLE_MAX_LENGTH } from "@notra/schemas/constants/dashboard/geo-shelf";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { Loader2Icon } from "lucide-react";

import type { GeoShelfTitleFieldProps } from "@/types/geo-shelf";

export function ShelfTitleField({
  id,
  value,
  errors,
  previewTitle,
  previewError,
  isPreviewLoading,
  showPreviewTitle,
  onBlur,
  onChange,
}: GeoShelfTitleFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <span className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>
          Title{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        {isPreviewLoading ? (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <Loader2Icon className="size-3 animate-spin" />
            Reading page title
          </span>
        ) : null}
        {!isPreviewLoading &&
        previewTitle !== null &&
        !showPreviewTitle &&
        value.trim() !== previewTitle ? (
          <button
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
            onClick={() => onChange(previewTitle)}
            type="button"
          >
            Use page title
          </button>
        ) : null}
      </span>
      <Input
        aria-describedby={errors.length > 0 ? errorId : undefined}
        aria-invalid={errors.length > 0}
        id={id}
        maxLength={GEO_SHELF_TITLE_MAX_LENGTH}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        placeholder={
          previewTitle ?? "We'll read it from the page if you leave this empty"
        }
        value={showPreviewTitle ? (previewTitle ?? "") : value}
      />
      {errors.length > 0 ? (
        <p className="text-destructive text-xs" id={errorId}>
          {String(errors[0])}
        </p>
      ) : null}
      {showPreviewTitle ? (
        <p className="text-muted-foreground text-xs">
          From the page's title tag. Type to override.
        </p>
      ) : null}
      {previewError ? (
        <p className="text-muted-foreground text-xs">{previewError}</p>
      ) : null}
    </div>
  );
}
