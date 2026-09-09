import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@notra/ui/lib/utils";

/** Top catch-light plus a hairline inner ring. Reads on saturated fills. */
const insetFill =
  "shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.32),inset_0_0_0_1px_rgb(255_255_255_/_0.14)]";

/** Top sheen plus a faint floor shade. Reads on plaster and gray fills. */
const insetSurface =
  "shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.7),inset_0_-1px_0_0_rgb(0_0_0_/_0.05)] dark:shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.1),inset_0_0_0_1px_rgb(255_255_255_/_0.06)]";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-lg border border-transparent bg-clip-padding font-medium text-sm outline-none transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-fast ease-out active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50 has-data-[disabled]:cursor-not-allowed aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: `bg-primary text-primary-foreground ${insetFill} hover:bg-primary/90 [a]:hover:bg-primary/90`,
        outline: `border-border bg-background ${insetSurface} hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50`,
        secondary: `bg-secondary text-secondary-foreground ${insetSurface} hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground`,
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive: `bg-destructive text-destructive-foreground ${insetFill} hover:bg-destructive/90 aria-expanded:bg-destructive aria-expanded:text-destructive-foreground`,
        link: "text-primary underline-offset-4",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-[>svg:first-child]:pl-2 has-[>svg:last-child]:pr-2 [&_svg:not([class*='size-'])]:size-4",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs has-[>svg:first-child]:pl-1.5 has-[>svg:last-child]:pr-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] has-[>svg:first-child]:pl-2 has-[>svg:last-child]:pr-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-3 has-[>svg:first-child]:pl-2.5 has-[>svg:last-child]:pr-2.5 [&_svg:not([class*='size-'])]:size-4",
        icon: "size-8 [&_svg:not([class*='size-'])]:size-4",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-9 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      className={cn(buttonVariants({ variant, size, className }))}
      data-slot="button"
      {...props}
    />
  );
}

export { Button, buttonVariants };
