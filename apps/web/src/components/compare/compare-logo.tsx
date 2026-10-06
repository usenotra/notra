import { cn } from "@notra/ui/lib/utils";

import { NOTRA_COMPARE_LOGO } from "@/constants/compare/page";
import type { CompareLockupProps, CompareLogoTileProps } from "@/types/compare";

const TILE_SIZE_CLASS = {
  xs: "size-8 rounded-lg p-1.5",
  sm: "size-10 rounded-[0.625rem] p-2",
  lg: "size-16 rounded-2xl p-3 sm:size-20 sm:p-3.5",
} as const;

export function CompareLogoTile({ logo, size = "lg" }: CompareLogoTileProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center bg-white [box-shadow:#E4E4E7_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.125rem] dark:[box-shadow:#FFFFFF29_0_0_0_0.0625rem]",
        TILE_SIZE_CLASS[size]
      )}
    >
      <img
        alt=""
        className="size-full object-contain"
        decoding="async"
        height={logo.height}
        src={logo.src}
        width={logo.width}
      />
    </span>
  );
}

export function CompareLockup({ competitor, size = "lg" }: CompareLockupProps) {
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <CompareLogoTile logo={NOTRA_COMPARE_LOGO} size={size} />
      <span
        className={cn(
          "font-display font-medium text-[#1E1E1E80] dark:text-white/50",
          size === "lg" ? "text-xl" : "text-sm"
        )}
      >
        vs
      </span>
      <CompareLogoTile logo={competitor.logo} size={size} />
    </div>
  );
}
