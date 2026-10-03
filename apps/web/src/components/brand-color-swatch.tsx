import { Copy01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { BrandColorSwatchProps } from "~types/brand";

import { copyToClipboard } from "@/utils/copy-to-clipboard";

export function BrandColorSwatch({ color }: BrandColorSwatchProps) {
  return (
    <button
      className="group border-border/70 bg-background duration-fast flex cursor-pointer flex-col overflow-hidden rounded-xl border text-left transition-transform ease-out active:scale-[0.98]"
      onClick={() => copyToClipboard(color.hex, `Copied ${color.hex}`)}
      type="button"
    >
      <span
        className="border-border/70 relative flex h-24 w-full items-center justify-center border-b"
        style={{ backgroundColor: color.hex }}
      >
        <span className="bg-background/90 text-foreground duration-fast flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium opacity-0 shadow-sm ring-1 ring-black/5 transition-opacity ease-out group-hover:opacity-100 dark:ring-white/10">
          <HugeiconsIcon className="size-3.5" icon={Copy01Icon} />
          Click to copy
        </span>
      </span>
      <span className="flex flex-col gap-1 p-4">
        <span className="text-foreground text-sm font-medium">
          {color.name}
        </span>
        <span className="text-muted-foreground font-mono text-xs uppercase">
          {color.hex}
        </span>
        <span className="text-muted-foreground text-xs leading-5">
          {color.usage}
        </span>
      </span>
    </button>
  );
}
