import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { MarketingButtonContent } from "./marketing-button-content";

const marketingButtonVariants = cva(
  "tracking-marketing focus-visible:ring-ring/50 relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap outline-none select-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "marketing-gradient-primary text-white",
        flat: "marketing-gradient-flat text-white",
        light: "marketing-gradient-light text-marketing-light-foreground",
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

type MarketingButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof marketingButtonVariants> & {
    /** Swaps the label for a spinner while an action runs. The button keeps its width. */
    loading?: boolean;
  };

function MarketingButton({
  className,
  variant = "primary",
  size = "default",
  loading = false,
  disabled,
  focusableWhenDisabled,
  children,
  ...props
}: MarketingButtonProps) {
  const base = cn(
    marketingButtonVariants({ variant, size }),
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
      data-slot="marketing-button"
      disabled={disabled || loading}
      // Keeps focus on the button while it loads instead of dropping it.
      focusableWhenDisabled={focusableWhenDisabled ?? loading}
      {...props}
    >
      <MarketingButtonContent loading={loading}>
        {children}
      </MarketingButtonContent>
    </ButtonPrimitive>
  );
}

export { MarketingButton, marketingButtonVariants };
export type { MarketingButtonProps };
