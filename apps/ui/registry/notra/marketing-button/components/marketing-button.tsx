import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const marketingButtonVariants = cva(
  "focus-visible:ring-ring/50 inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-medium tracking-[-0.015em] whitespace-nowrap outline-none select-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "marketing-gradient-primary text-white",
        light: "marketing-gradient-light text-neutral-900",
      },
      size: {
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
  VariantProps<typeof marketingButtonVariants>;

function MarketingButton({
  className,
  size,
  variant,
  ...props
}: MarketingButtonProps) {
  const base = marketingButtonVariants({ size, variant });

  return (
    <ButtonPrimitive
      className={
        typeof className === "function"
          ? (state) => cn(base, className(state))
          : cn(base, className)
      }
      data-slot="marketing-button"
      {...props}
    />
  );
}

export { MarketingButton, marketingButtonVariants };
export type { MarketingButtonProps };
