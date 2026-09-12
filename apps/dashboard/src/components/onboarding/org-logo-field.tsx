"use client";

import { Upload01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ALLOWED_RASTER_MIME_TYPES } from "@notra/schemas/constants/dashboard/upload";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { cn } from "@notra/ui/lib/utils";
import { useRef } from "react";

import type { OrgLogoFieldProps } from "@/types/onboarding";

const ACCEPTED_LOGO_TYPES = ALLOWED_RASTER_MIME_TYPES.join(",");

export function OrgLogoField({
  disabled,
  isLoading,
  onSelect,
  previewUrl,
}: OrgLogoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (isLoading && !previewUrl) {
    return <Skeleton className="size-11 shrink-0 rounded-xl" />;
  }

  return (
    <>
      <input
        accept={ACCEPTED_LOGO_TYPES}
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            onSelect(file);
          }
        }}
        ref={inputRef}
        type="file"
      />
      <button
        aria-label="Upload logo"
        className="group/logo shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        <Avatar
          className={cn(
            "border-border group-hover/logo:ring-muted-foreground/20 group-focus-visible/logo:ring-ring relative size-11 rounded-xl border ring-2 ring-transparent transition-shadow",
            !previewUrl && "border-dashed"
          )}
        >
          <AvatarImage
            alt="Logo"
            className="rounded-xl"
            src={previewUrl ?? undefined}
          />
          <AvatarFallback className="bg-muted/50 rounded-xl">
            <HugeiconsIcon
              className="text-muted-foreground size-5"
              icon={Upload01Icon}
            />
          </AvatarFallback>
          {previewUrl ? (
            <span className="bg-background/80 absolute inset-0 flex items-center justify-center rounded-xl opacity-0 transition-opacity group-hover/logo:opacity-100">
              <HugeiconsIcon className="size-5" icon={Upload01Icon} />
            </span>
          ) : null}
        </Avatar>
      </button>
    </>
  );
}
