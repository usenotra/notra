"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { useRouter } from "next/navigation";

import type { CompetitorSheetProps } from "@/types/geo";

const COMPETITOR_SHEET_CONTENT_CLASS =
  "gap-0 overflow-y-auto p-6 transition-[filter] data-[nested-dialog-open]:blur-xs data-[nested-dialog-open]:brightness-95 data-[side=right]:w-full sm:rounded-xl sm:border data-[side=right]:sm:inset-y-2 data-[side=right]:sm:right-2 data-[side=right]:sm:h-auto data-[side=right]:sm:max-w-3xl [&>*]:min-w-0";

export function CompetitorModal({ title, children }: CompetitorSheetProps) {
  const router = useRouter();

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) {
          router.back();
        }
      }}
      open
    >
      <SheetContent className={COMPETITOR_SHEET_CONTENT_CLASS}>
        <SheetHeader className="sr-only">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            How AI engines mention {title} across your tracked prompts
          </SheetDescription>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
