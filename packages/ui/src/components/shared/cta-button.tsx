import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@notra/ui/lib/utils";

import { CtaButtonContent } from "./cta-button-content";

const ctaButtonVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium tracking-[-0.015em] outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "cta-gradient-primary text-white",
        flat: "cta-gradient-primary-flat text-white",
        light: "cta-gradient-light text-[#1e1e1e]",
      },
      size: {
        sm: "h-10 px-5.5 text-sm [&_svg:not([class*='size-'])]:size-4",
        default: "h-11 px-6 text-base [&_svg:not([class*='size-'])]:size-4",
        lg: "h-12 px-8 text-lg [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

type CtaButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof ctaButtonVariants> & {
    /** Swaps the label for a spinner while an action runs. The button keeps its width. */
    loading?: boolean;
  };

function CtaButton({
  className,
  variant = "primary",
  size = "default",
  loading = false,
  disabled,
  focusableWhenDisabled,
  children,
  ...props
}: CtaButtonProps) {
  const base = cn(
    ctaButtonVariants({ variant, size }),
    "has-data-[clip]:overflow-hidden",
    loading && "cursor-progress"
  );

  return (
    <ButtonPrimitive
      aria-busy={loading || undefined}
      className={
        typeof className === "function"
          ? (state) => cn(base, className(state))
          : cn(base, className)
      }
      data-loading={loading ? "" : undefined}
      data-slot="cta-button"
      disabled={disabled || loading}
      // Keeps focus on the button while it loads instead of dropping it.
      focusableWhenDisabled={focusableWhenDisabled ?? loading}
      {...props}
    >
      <CtaButtonContent loading={loading}>{children}</CtaButtonContent>
    </ButtonPrimitive>
  );
}

export { CtaButton, ctaButtonVariants };
export type { CtaButtonProps };
