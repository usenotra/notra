import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@notra/ui/components/ui/popover";

import { Button } from "@/components/button";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import type { SentimentThemesEmptyProps } from "@/types/geo-sentiment";

export function SentimentThemesEmpty({
  title,
  message,
  canAnalyze,
  retrying,
  analyze,
}: SentimentThemesEmptyProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <div className="relative w-full overflow-hidden rounded-2xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 px-3 pt-3 select-none sm:px-4 sm:pt-4"
      >
        <div className="mask-[linear-gradient(to_bottom,black_0%,transparent_100%)] opacity-[0.38]">
          <EmptyStateTablePreview
            columns={EMPTY_STATE_TABLE_COLUMNS.prompts}
            rows={EMPTY_STATE_TABLE_ROWS}
          />
        </div>
      </div>
      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-12 text-center md:py-16">
        <h3 className="text-xl font-semibold text-balance">{title}</h3>
        {message ? (
          <p className="text-muted-foreground max-w-sm text-sm">{message}</p>
        ) : null}
        {canAnalyze ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => setConfirmOpen(true)}>
              {retrying ? "Retry finding themes" : "Find themes"}
            </Button>
            <Popover>
              <PopoverTrigger render={<Button variant="outline" />}>
                How it works
              </PopoverTrigger>
              <PopoverContent className="max-w-[calc(100vw-2rem)] p-4">
                <PopoverTitle>Finding sentiment themes</PopoverTitle>
                <PopoverDescription>
                  Find positives and negatives in a sample of saved answers.
                  Each theme links to its original quotes.
                </PopoverDescription>
              </PopoverContent>
            </Popover>
          </div>
        ) : null}
      </div>
      <ResponsiveAlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>
              Find sentiment themes?
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              Analyze saved answers for the selected project and date range. A
              new analysis uses AI credits based on token usage, or one AI
              answer on quota-based plans. Reusing a cached analysis has no
              additional cost.
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <p className="text-muted-foreground text-sm">
            An AI attempt may still use credits if it fails or finds no themes.
          </p>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel>Cancel</ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                analyze();
              }}
            >
              Confirm and analyze
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </div>
  );
}
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@notra/ui/components/shared/responsive-alert-dialog";
import { useState } from "react";
