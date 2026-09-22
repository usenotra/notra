"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { useState } from "react";

import { GapAnswerPanel } from "@/components/geo/gap-answer-panel";
import type { GeoGapDetailSheetProps } from "@/types/components/geo-gaps";
import { gapMissingEngineFamilies } from "@/utils/geo-gaps";

export function GapDetailSheet({
  prompt,
  organizationId,
  isScanning,
  actions,
  onOpenChange,
}: GeoGapDetailSheetProps) {
  // Keep the last gap rendered while the sheet animates out, e.g. after an
  // ignored gap disappears from the list.
  const [retained, setRetained] = useState(prompt);
  if (prompt && prompt !== retained) {
    setRetained(prompt);
  }
  const gap = prompt ?? retained;
  const headline = gap?.brief?.workingTitle ?? gap?.title ?? null;
  const visible = gapMissingEngineFamilies(gap?.mentionedEngines ?? []).length;
  const total = gapMissingEngineFamilies([
    ...(gap?.mentionedEngines ?? []),
    ...(gap?.engines ?? []),
  ]).length;
  const coverage = `Mentioned by ${visible} of ${total} engines`;

  return (
    <Sheet onOpenChange={onOpenChange} open={prompt !== null}>
      <SheetContent side="right" variant="inset">
        <SheetHeader className="bg-muted/50 shrink-0 gap-1.5 border-b pr-14">
          <SheetTitle className="text-base leading-snug text-balance break-words">
            {headline ?? gap?.prompt ?? "Content gap"}
          </SheetTitle>
          <SheetDescription className="break-words">
            {headline && gap && headline !== gap.prompt ? gap.prompt : coverage}
          </SheetDescription>
        </SheetHeader>

        {gap ? (
          <GapAnswerPanel
            isScanning={isScanning}
            key={gap.id}
            organizationId={organizationId}
            prompt={gap.prompt}
            promptId={gap.id}
          />
        ) : null}

        {actions ? (
          <SheetFooter className="shrink-0 flex-row justify-end border-t p-4">
            {actions}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
