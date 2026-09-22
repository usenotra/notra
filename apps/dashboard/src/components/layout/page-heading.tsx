import { cn } from "@/lib/utils";
import type { PageHeadingProps } from "@/types/layout/page-heading";

export function PageHeading({
  title,
  description,
  children,
  className,
}: PageHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 @min-[40rem]/main:flex-row @min-[40rem]/main:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
