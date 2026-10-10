import { cn } from "@notra/ui/lib/utils";

import { SitesLogo } from "@/components/feature-pages/sites-logo";
import {
  SITES_DOMAIN_OPTIONS,
  SITES_MOCK_SURFACE_CLASS,
  SITES_PLATFORMS,
} from "@/constants/feature-pages/sites";

export function SitesCardDomains() {
  return (
    <div aria-hidden="true" className={cn(SITES_MOCK_SURFACE_CLASS, "p-4")}>
      <div className="flex flex-col gap-3">
        {SITES_DOMAIN_OPTIONS.map((option, index) => {
          const selected = index === 0;

          return (
            <div
              className={cn(
                "flex items-start gap-3.5 rounded-xl border px-4 py-4",
                selected &&
                  "border-[#B39CE4] bg-[#F7F3FE] ring-3 ring-[#8B5CF6]/10 dark:border-[#8B5CF6]/60 dark:bg-[#8B5CF6]/10"
              )}
              key={option.url}
            >
              <span
                className={cn(
                  "mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border",
                  selected && "border-[#8B5CF6]"
                )}
              >
                {selected ? (
                  <span className="size-2 rounded-full bg-[#8B5CF6]" />
                ) : null}
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {option.label}
                </span>
                <span className="text-foreground font-mono text-lg/6 font-medium">
                  {option.url}
                </span>
                <span className="text-muted-foreground text-[0.8125rem]/5">
                  {option.detail}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2.5 px-1 pt-5">
        <span className="text-muted-foreground text-xs">
          Path setup guides for
        </span>
        <div className="grid grid-cols-5 gap-2">
          {SITES_PLATFORMS.map((platform) => (
            <span
              className="bg-muted/50 flex flex-col items-center gap-2 rounded-xl border px-1 py-3"
              key={platform.name}
            >
              <SitesLogo
                className="text-foreground size-5"
                platform={platform}
              />
              <span className="text-muted-foreground truncate text-[0.6875rem]">
                {platform.name}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
