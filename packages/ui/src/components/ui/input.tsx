import { Input as InputPrimitive } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@notra/ui/lib/utils";

const inputVariants = cva(
  "w-full min-w-0 border border-input bg-transparent outline-none transition-colors file:inline-flex file:h-6 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 dark:disabled:bg-input/80",
  {
    variants: {
      size: {
        default: "h-8 rounded-lg px-2.5 py-1 text-base",
        sm: "h-7 rounded-[min(var(--radius-md),12px)] px-2 text-sm",
        lg: "h-9 rounded-lg px-3 py-1 text-base",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

function Input({
  className,
  type,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants>) {
  return (
    <InputPrimitive
      className={cn(inputVariants({ size, className }))}
      data-size={size}
      data-slot="input"
      type={type}
      {...props}
    />
  );
}

export { Input, inputVariants };
