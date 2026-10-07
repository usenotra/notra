import { Copy01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button, buttonVariants } from "@notra/ui/components/ui/button";
import { cn } from "@notra/ui/lib/utils";
import type { BrandAssetCardProps } from "~types/brand";

import { copySvgAsset } from "@/utils/copy-svg-asset";

export function BrandAssetCard({
  variant,
  asset,
  downloadName,
  copyLabel,
  children,
}: BrandAssetCardProps) {
  return (
    <div
      className={cn(
        "group border-border/70 relative flex h-48 items-center justify-center rounded-2xl border",
        variant === "light" ? "bg-white" : "bg-[#131316]"
      )}
    >
      {children}
      <div className="duration-fast absolute top-3 right-3 flex items-center gap-1.5 opacity-0 transition-opacity ease-out group-focus-within:opacity-100 group-hover:opacity-100">
        <Button
          aria-label={copyLabel}
          onClick={() => copySvgAsset(asset.svg, "Copied SVG to clipboard")}
          size="icon-sm"
          variant="secondary"
        >
          <HugeiconsIcon icon={Copy01Icon} />
        </Button>
        <a
          className={buttonVariants({ size: "sm", variant: "secondary" })}
          download={`${downloadName}.svg`}
          href={asset.svg}
        >
          SVG
        </a>
        <a
          className={buttonVariants({ size: "sm", variant: "secondary" })}
          download={`${downloadName}.png`}
          href={asset.png}
        >
          PNG
        </a>
      </div>
    </div>
  );
}
