"use client";

import { OTPField } from "@base-ui/react/otp-field";
import type * as React from "react";

import { cn } from "@notra/ui/lib/utils";

/**
 * One-time-code input built on Base UI's OTP Field. Each slot is a real
 * `<input>`; the root handles focus movement, paste, and autofill.
 */
function InputOTP({
  className,
  ...props
}: React.ComponentProps<typeof OTPField.Root>) {
  return (
    <OTPField.Root
      className={cn(
        "flex items-center gap-2 data-disabled:opacity-50",
        className
      )}
      data-slot="input-otp"
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      data-slot="input-otp-group"
      {...props}
    />
  );
}

function InputOTPSlot({
  className,
  ...props
}: React.ComponentProps<typeof OTPField.Input>) {
  return (
    <OTPField.Input
      className={cn(
        "relative h-11 w-10 rounded-xl border border-input bg-transparent text-center font-mono text-base tabular-nums caret-foreground outline-none dark:bg-input/30",
        "transition-[border-color,box-shadow,background-color,transform] duration-normal ease-out motion-reduce:transition-none",
        "data-filled:border-foreground/30 data-filled:bg-muted/50",
        "focus-visible:z-10 focus-visible:scale-[1.04] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 motion-reduce:focus-visible:scale-100",
        "aria-invalid:border-destructive focus-visible:aria-invalid:ring-destructive/20 dark:focus-visible:aria-invalid:ring-destructive/40",
        "disabled:cursor-not-allowed",
        className
      )}
      data-slot="input-otp-slot"
      {...props}
    />
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot };
