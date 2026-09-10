"use client";

import { Copy01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Button } from "@/components/button";
import { LogEventSummary } from "@/components/logs/log-event-summary";
import { LogTechnicalDetails } from "@/components/logs/log-technical-details";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { LogDetailsSheetProps } from "@/types/logs/details-sheet";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";
import { getLogDestination } from "@/utils/log-details";
import { formatLogTimestamp } from "@/utils/logs";

export function LogDetailsSheet({
  log,
  onOpenChange,
  open,
  organizationId,
  organizationSlug,
}: LogDetailsSheetProps) {
  const detail = useQuery({
    ...dashboardOrpc.logs.webhooks.get.queryOptions({
      input: { organizationId, logId: log?.id ?? "" },
    }),
    enabled: open && Boolean(organizationId && log?.hasPayload),
    staleTime: 60_000,
    retry: false,
  });
  const entry = detail.data ?? log;
  const destination = entry
    ? getLogDestination(entry.integrationType, organizationSlug)
    : null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-hidden rounded-2xl data-[side=right]:inset-y-2 data-[side=right]:right-2 data-[side=right]:h-auto data-[side=right]:w-[calc(100%-1rem)] data-[side=right]:border data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-5 pr-14">
          <SheetTitle>Event details</SheetTitle>
          <SheetDescription>
            {entry
              ? formatLogTimestamp(entry.createdAt, "long")
              : "Inspect this integration event."}
          </SheetDescription>
        </SheetHeader>
        {entry ? (
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <LogEventSummary entry={entry} />
            {log?.hasPayload && detail.isPending ? (
              <p className="text-muted-foreground text-sm" role="status">
                Loading event context…
              </p>
            ) : null}
            {detail.isError ? (
              <div className="space-y-2" role="alert">
                <p className="text-sm">{detail.error.message}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => detail.refetch()}
                >
                  Retry details
                </Button>
              </div>
            ) : null}
            <LogTechnicalDetails entry={entry} />
          </div>
        ) : null}
        {entry ? (
          <SheetFooter className="flex flex-wrap gap-2 border-t px-6 py-4 sm:flex-row sm:justify-between">
            <Button
              variant="outline"
              onClick={() =>
                copyTextToClipboard(
                  JSON.stringify(entry, null, 2),
                  "Event details copied"
                )
              }
            >
              <HugeiconsIcon icon={Copy01Icon} className="size-4" />
              Copy details
            </Button>
            {destination ? (
              <Button
                render={<Link href={destination.href} />}
                nativeButton={false}
                onClick={() => onOpenChange(false)}
              >
                {destination.label}
              </Button>
            ) : null}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
