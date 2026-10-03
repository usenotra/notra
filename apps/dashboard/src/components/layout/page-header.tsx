import type { PageHeaderProps } from "@/types/components/page-header";

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <header className="flex shrink-0 flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
          {title}
        </h1>
        <p className="text-muted-foreground text-sm text-pretty">
          {description}
        </p>
      </div>
      {children}
    </header>
  );
}
