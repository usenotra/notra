import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type * as React from "react";

import { Button } from "@/components/ui/button";

const marketingButtonVariants = cva(
  "cursor-pointer gap-2 rounded-full border-0 font-medium tracking-[-0.015em] focus-visible:ring-[0.1875rem]",
  {
    variants: {
      variant: {
        primary: "marketing-gradient-primary text-white hover:text-white",
        light: "marketing-gradient-light text-[#1e1e1e] hover:text-[#1e1e1e]",
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

type MarketingButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "className" | "size" | "variant"
> &
  VariantProps<typeof marketingButtonVariants> & { className?: string };

function MarketingButton({
  className,
  size = "default",
  variant = "primary",
  ...props
}: MarketingButtonProps) {
  return (
    <Button
      className={cn(marketingButtonVariants({ size, variant }), className)}
      data-slot="marketing-button"
      {...props}
    />
  );
}

export { MarketingButton, marketingButtonVariants };
export type { MarketingButtonProps };
