import type { PageHeadingProps } from "@notra/ui/types/page-heading";

import { cn } from "@notra/ui/lib/utils";

/**
 * Page title block for dashboard pages. Responds to the nearest
 * `@container/main` ancestor: stacked below 40rem, title and actions side by
 * side above it. Without that container it stays stacked.
 */
export function PageHeading({
  title,
  description,
  icon,
  children,
  className,
}: PageHeadingProps) {
  const text = (
    <div className="max-w-full min-w-0 space-y-1 wrap-anywhere">
      <h1 className="text-2xl font-bold tracking-tight text-balance @min-[40rem]/main:text-3xl">
        {title}
      </h1>
      {description ? (
        <p className="text-muted-foreground text-sm text-pretty">
          {description}
        </p>
      ) : null}
    </div>
  );

  return (
    <header
      className={cn(
        "flex shrink-0 flex-col items-start gap-3 @min-[40rem]/main:flex-row @min-[40rem]/main:justify-between",
        className
      )}
    >
      {icon ? (
        <div className="flex max-w-full min-w-0 items-center gap-3">
          {icon}
          {text}
        </div>
      ) : (
        text
      )}
      {children}
    </header>
  );
}
