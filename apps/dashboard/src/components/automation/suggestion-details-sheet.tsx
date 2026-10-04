"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { useTranslations } from "use-intl";

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
  const t = useTranslations("automation.suggestions");
  const tCommon = useTranslations("common");
  const kind = suggestion.type === "schedule_automation" ? "schedule" : "event";

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="overflow-hidden rounded-xl data-[side=right]:inset-y-2 data-[side=right]:right-2 data-[side=right]:h-auto data-[side=right]:w-[calc(100%-1rem)] data-[side=right]:border sm:max-w-md">
        <SheetHeader className="bg-muted/50 border-b pr-14">
          <SheetTitle className="wrap-anywhere">{suggestion.title}</SheetTitle>
          <SheetDescription>
            {t("reviewDescription", { kind })}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
          {suggestion.description ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium">
                {tCommon("labels.recommendation")}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">
                {suggestion.description}
              </p>
            </section>
          ) : null}

          {suggestion.evidence ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium">{t("whyThisFits")}</h3>
              <div className="bg-muted/50 rounded-lg border p-3">
                <p className="text-muted-foreground text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">
                  {suggestion.evidence}
                </p>
              </div>
            </section>
          ) : null}
        </div>

        <SheetFooter className="bg-muted/50 border-t sm:flex-row sm:justify-end">
          <Button disabled={dismissing} onClick={onDismiss} variant="outline">
            {tCommon("labels.dismiss")}
          </Button>
          <Button disabled={dismissing} onClick={onCreate}>
            {t("create", { kind })}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
