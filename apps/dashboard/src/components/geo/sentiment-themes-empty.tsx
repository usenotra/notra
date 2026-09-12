import { Comment01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@notra/ui/components/ui/popover";

import { Button } from "@/components/button";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import type { SentimentThemesEmptyProps } from "@/types/geo-sentiment";

export function SentimentThemesEmpty({
  title,
  message,
  canAnalyze,
  retrying,
  analyze,
}: SentimentThemesEmptyProps) {
  return (
    <div className="border-border bg-muted/10 flex min-h-44 items-center justify-center gap-6 rounded-2xl border px-5 py-6">
      <div
        aria-hidden="true"
        className="pointer-events-none hidden w-36 shrink-0 [mask-image:linear-gradient(to_bottom,black_65%,transparent)] opacity-45 sm:block"
      >
        <EmptyStateTablePreview columns={[24, 56, 20]} rows={2} />
      </div>
      <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:items-start sm:text-left">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            aria-hidden="true"
            icon={Comment01Icon}
            size={18}
            className="text-muted-foreground shrink-0"
          />
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        {message ? (
          <p className="text-muted-foreground max-w-sm text-sm">{message}</p>
        ) : null}
        {canAnalyze ? (
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <Button onClick={analyze}>
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
    </div>
  );
}
