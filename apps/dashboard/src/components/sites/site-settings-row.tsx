import type { SiteSettingsRowProps } from "@/types/components/sites";

export function SiteSettingsRow({
  label,
  htmlFor,
  description,
  children,
}: SiteSettingsRowProps) {
  return (
    <div className="grid gap-x-12 gap-y-3 py-4 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-1 lg:pt-1.5">
        {htmlFor ? (
          <label className="text-sm font-medium" htmlFor={htmlFor}>
            {label}
          </label>
        ) : (
          <p className="text-sm font-medium">{label}</p>
        )}
        {description ? (
          <p className="text-muted-foreground text-xs text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      <div className="min-w-0 lg:max-w-2xl">{children}</div>
    </div>
  );
}
