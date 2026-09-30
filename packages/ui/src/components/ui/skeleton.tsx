import { cn } from "@notra/ui/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted before:absolute before:inset-0 before:animate-skeleton-shimmer before:bg-linear-to-r before:from-transparent before:via-white/70 before:to-transparent motion-reduce:before:hidden dark:before:via-white/10",
        className
      )}
      data-slot="skeleton"
      {...props}
    />
  );
}

export { Skeleton };
