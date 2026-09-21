"use client";

import type { GeoPromptReceiptView } from "@notra/geo-core/types/geo";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { tween } from "@notra/ui/lib/motion";
import { AnimatePresence, LazyMotion, m, useReducedMotion } from "motion/react";
import { useState } from "react";

import { Button } from "@/components/button";
import { PromptAnswerContent } from "@/components/geo/prompt-answer-content";
import { PromptEngineSwitcher } from "@/components/geo/prompt-engine-switcher";
import { PromptReceiptViewSwitch } from "@/components/geo/prompt-receipt-view-switch";
import {
  DESIGN_SYSTEM_GAP_RESULTS,
  DESIGN_SYSTEM_PROMPT_GAP,
} from "@/constants/design-system-gaps";

const loadMotionFeatures = () =>
  import("@/lib/motion-features").then((mod) => mod.default);

export function PrototypeAnswerSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const results = DESIGN_SYSTEM_GAP_RESULTS;
  const [engine, setEngine] = useState(results[0]?.engine ?? "");
  const [view, setView] = useState<GeoPromptReceiptView>("analysis");
  const active = results.find((row) => row.engine === engine) ?? results[0];
  const mentioning = results.filter((row) => row.mentioned).length;
  const reduceMotion = useReducedMotion();

  if (!active) {
    return null;
  }

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent side="right" variant="inset">
        <SheetHeader className="bg-muted/50 shrink-0 gap-1.5 border-b pr-14">
          <SheetTitle className="text-base leading-snug text-balance break-words">
            {DESIGN_SYSTEM_PROMPT_GAP.prompt}
          </SheetTitle>
          <SheetDescription>
            Mentioned by {mentioning} of {results.length} engines
          </SheetDescription>
        </SheetHeader>

        <div className="flex shrink-0 flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b px-4 py-3">
          <PromptEngineSwitcher
            active={active}
            onChange={(next) => setEngine(next)}
            results={results}
          />
          <PromptReceiptViewSwitch onChange={setView} view={view} />
        </div>

        <LazyMotion features={loadMotionFeatures} strict>
          <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <AnimatePresence initial={false} mode="wait">
              <m.div
                animate={{ opacity: 1, y: 0 }}
                className="flex min-h-full min-w-0 flex-col"
                exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
                key={`${active.engine}:${view}`}
                transition={reduceMotion ? { duration: 0 } : tween("fast")}
              >
                <PromptAnswerContent
                  history={[]}
                  isHistoryLoading={false}
                  onRetry={() => undefined}
                  prompt={DESIGN_SYSTEM_PROMPT_GAP.prompt}
                  scrollable={false}
                  showHistory={false}
                  state={{ status: "ready", result: active }}
                  view={view}
                />
              </m.div>
            </AnimatePresence>
          </div>
        </LazyMotion>

        <SheetFooter className="shrink-0 flex-row justify-end border-t p-4">
          <Button variant="ghost">Ignore</Button>
          <Button>Write</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
