"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";

import { Button } from "@/components/button";
import type { SuggestionDetailsSheetProps } from "@/types/components/onboarding-suggestions";

export function SuggestionDetailsSheet({
  dismissing,
  onCreate,
  onDismiss,
  onOpenChange,
  open,
  suggestion,
}: SuggestionDetailsSheetProps) {
  const automationLabel =
    suggestion.type === "schedule_automation" ? "schedule" : "event automation";

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="overflow-hidden rounded-xl data-[side=right]:inset-y-2 data-[side=right]:right-2 data-[side=right]:h-auto data-[side=right]:w-[calc(100%-1rem)] data-[side=right]:border sm:max-w-md">
        <SheetHeader className="bg-muted/50 border-b pr-14">
          <SheetTitle>{suggestion.title}</SheetTitle>
          <SheetDescription>
            Review the recommendation before creating this {automationLabel}.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
          {suggestion.description ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium">Recommendation</h3>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {suggestion.description}
              </p>
            </section>
          ) : null}

          {suggestion.evidence ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium">Why this fits</h3>
              <div className="bg-muted/50 rounded-lg border p-3">
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                  {suggestion.evidence}
                </p>
              </div>
            </section>
          ) : null}
        </div>

        <SheetFooter className="bg-muted/50 border-t sm:flex-row sm:justify-end">
          <Button disabled={dismissing} onClick={onDismiss} variant="outline">
            Dismiss
          </Button>
          <Button disabled={dismissing} onClick={onCreate}>
            Create {automationLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
