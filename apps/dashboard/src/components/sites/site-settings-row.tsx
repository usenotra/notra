import type { SiteSettingsRowProps } from "@/types/components/sites";

export function SiteSettingsRow({
  label,
  htmlFor,
  description,
  children,
}: SiteSettingsRowProps) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-2 py-4 first:pt-0 last:pb-0 lg:grid-cols-3">
      <div className="min-w-0 space-y-1">
        {htmlFor ? (
          <label
            className="flex items-center text-sm font-medium lg:min-h-8"
            htmlFor={htmlFor}
          >
            {label}
          </label>
        ) : (
          <p className="flex items-center text-sm font-medium lg:min-h-8">
            {label}
          </p>
        )}
        {description ? (
          <p className="text-muted-foreground text-xs text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      <div className="grid w-full min-w-0 items-center lg:col-span-2 lg:min-h-8 lg:max-w-2xl lg:self-start">
        {children}
      </div>
    </div>
  );
}
