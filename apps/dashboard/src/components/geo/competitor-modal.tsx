"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { CompetitorSheetProps } from "@/types/geo";

const COMPETITOR_SHEET_CONTENT_CLASS =
  "gap-0 overflow-y-auto p-6 data-[side=right]:w-full sm:rounded-xl sm:border data-[side=right]:sm:inset-y-2 data-[side=right]:sm:right-2 data-[side=right]:sm:h-auto data-[side=right]:sm:max-w-3xl [&>*]:min-w-0";

export function CompetitorModal({ title, children }: CompetitorSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  return (
    <Sheet
      onOpenChange={setOpen}
      onOpenChangeComplete={(nextOpen) => {
        if (!nextOpen) {
          router.back();
        }
      }}
      open={open}
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
