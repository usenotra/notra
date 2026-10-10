import { GitPullRequestIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notra } from "@notra/ui/components/ui/svgs/notra";
import { cn } from "@notra/ui/lib/utils";

import {
  SITES_BRAND_SWATCHES,
  SITES_MOCK_SURFACE_CLASS,
  SITES_STARTER_FILES,
  SITES_STARTER_PR,
} from "@/constants/feature-pages/sites";

export function SitesCardStarter() {
  return (
    <div aria-hidden="true" className={cn(SITES_MOCK_SURFACE_CLASS, "p-4")}>
      <div className="flex items-center gap-3 px-1 pb-4">
        <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full border">
          <Notra className="size-4.5" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-foreground truncate text-[0.9375rem]/5 font-semibold">
            {SITES_STARTER_PR.title}
          </span>
          <span className="text-muted-foreground text-xs/5">
            <span className="text-foreground font-medium">
              {SITES_STARTER_PR.author}
            </span>{" "}
            opened from{" "}
            <span className="font-mono">{SITES_STARTER_PR.branch}</span>
          </span>
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-[#1F883D] px-2.5 py-0.75 text-xs font-medium text-white">
          <HugeiconsIcon className="size-3.5" icon={GitPullRequestIcon} />
          Open
        </span>
      </div>

      <div className="bg-muted/40 flex flex-col gap-3 rounded-xl border px-4 py-4">
        <span className="text-muted-foreground text-xs">
          From your Brand Identity
        </span>
        <div className="flex items-center gap-4">
          <span className="bg-background flex h-12 shrink-0 items-center gap-2 rounded-lg border px-3.5">
            <span className="size-4.5 rounded-[0.3rem] bg-[#16A34A]" />
            <span className="text-foreground text-base font-semibold tracking-[-0.01em]">
              Acme
            </span>
          </span>
          <div className="flex min-w-0 flex-1 gap-2">
            {SITES_BRAND_SWATCHES.map((swatch) => (
              <span
                className="flex min-w-0 flex-1 flex-col gap-1.5"
                key={swatch.name}
              >
                <span
                  className="h-8 rounded-lg ring-1 ring-black/5 ring-inset"
                  style={{ backgroundColor: swatch.hex }}
                />
                <span className="text-muted-foreground truncate font-mono text-[0.6875rem]">
                  {swatch.hex}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-col overflow-clip rounded-xl border">
        <div className="bg-muted/60 text-muted-foreground flex items-center justify-between border-b px-4 py-2 text-xs">
          <span>Files changed</span>
          <span className="font-mono">{SITES_STARTER_FILES.length}</span>
        </div>
        {SITES_STARTER_FILES.map((file) => (
          <div
            className="flex items-center justify-between gap-3 border-b px-4 py-2.5 last:border-b-0"
            key={file.path}
          >
            <span className="text-foreground truncate font-mono text-[0.8125rem]">
              {file.path}
            </span>
            <span className="shrink-0 font-mono text-xs text-[#1F883D] dark:text-[#3FB950]">
              +{file.additions}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
