import { cn } from "@notra/ui/lib/utils";
import type { ComponentProps } from "react";

export function Spinner({ className, ...props }: ComponentProps<"svg">) {
  return (
    <svg
      aria-hidden="true"
      className={cn("size-4 shrink-0 motion-safe:animate-spin", className)}
      data-slot="spinner"
      fill="none"
      viewBox="0 0 16 16"
      {...props}
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M14 8A6 6 0 0 0 8 2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}
