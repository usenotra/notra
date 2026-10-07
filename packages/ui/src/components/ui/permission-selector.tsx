"use client";

import type { ReactNode } from "react";
import { useUiLabels } from "@notra/ui/components/shared/ui-labels-provider";
import { cn } from "@notra/ui/lib/utils";
import {
  PermissionOption,
  type PermissionOptionProps,
} from "./permission-option";
import { PermissionRow, type PermissionRowProps } from "./permission-row";
import type {
  PermissionIndicatorMotion,
  PermissionTone,
} from "./permission-selector-context";

export interface PermissionSelectorProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

function PermissionSelector({
  children,
  label,
  className,
}: PermissionSelectorProps) {
  const labels = useUiLabels();
  return (
    <fieldset
      className={cn(
        "w-full divide-y overflow-hidden rounded-xl border bg-background",
        className
      )}
    >
      <legend className="sr-only">{label ?? labels.permissions}</legend>
      {children}
    </fieldset>
  );
}

export { PermissionSelector, PermissionRow, PermissionOption };
export type {
  PermissionIndicatorMotion,
  PermissionOptionProps,
  PermissionRowProps,
  PermissionTone,
};
