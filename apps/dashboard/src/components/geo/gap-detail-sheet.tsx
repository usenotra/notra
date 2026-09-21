"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";

import { GapAnswerPanel } from "@/components/geo/gap-answer-panel";
import { useRetainedValue } from "@/lib/hooks/use-retained-value";
import type { GeoGapDetailSheetProps } from "@/types/components/geo-gaps";
import { gapMissingEngineFamilies } from "@/utils/geo-gaps";

function GapDetailHeader({ gap }: { gap: GeoGapDetailSheetProps["prompt"] }) {
  const headline = gap?.brief?.workingTitle ?? gap?.title ?? null;
  const visible = gapMissingEngineFamilies(gap?.mentionedEngines ?? []).length;
  const total = gapMissingEngineFamilies([
    ...(gap?.mentionedEngines ?? []),
    ...(gap?.engines ?? []),
  ]).length;
  const coverage = `Mentioned by ${visible} of ${total} engines`;

  return (
    <SheetHeader className="bg-muted/50 shrink-0 gap-1.5 border-b pr-14">
      <SheetTitle className="text-base leading-snug text-balance break-words">
        {headline ?? gap?.prompt ?? "Content gap"}
      </SheetTitle>
      <SheetDescription className="break-words">
        {headline && gap && headline !== gap.prompt ? gap.prompt : coverage}
      </SheetDescription>
    </SheetHeader>
  );
}

export function GapDetailSheet({
  prompt,
  organizationId,
  isScanning,
  actions,
  onOpenChange,
}: GeoGapDetailSheetProps) {
  const [gap, releaseGap] = useRetainedValue(prompt);

  return (
    <Sheet
      onOpenChange={onOpenChange}
      onOpenChangeComplete={releaseGap}
      open={prompt !== null}
    >
      <SheetContent side="right" variant="inset">
        <GapDetailHeader gap={gap} />

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
