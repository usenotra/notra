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
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";

import { Button } from "@/components/button";
import { LogEventSummary } from "@/components/logs/log-event-summary";
import { LogTechnicalDetails } from "@/components/logs/log-technical-details";
import { useRetainedValue } from "@/lib/hooks/use-retained-value";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { LogDetailsSheetProps } from "@/types/logs/details-sheet";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";
import { getLogDestination } from "@/utils/log-details";

export function LogDetailsSheet({
  log: logProp,
  onOpenChange,
  open,
  organizationId,
  organizationSlug,
}: LogDetailsSheetProps) {
  const t = useTranslations("logs.details");
  const tLabels = useTranslations("common.labels");
  const format = useFormatter();
  const [log, releaseLog] = useRetainedValue(logProp);
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
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={releaseLog}
    >
      <SheetContent className="flex flex-col gap-0 overflow-hidden rounded-2xl data-[side=right]:inset-y-2 data-[side=right]:right-2 data-[side=right]:h-auto data-[side=right]:w-[calc(100%-1rem)] data-[side=right]:border data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-5 pr-14">
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>
            {entry
              ? format.dateTime(new Date(entry.createdAt), {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : t("inspect")}
          </SheetDescription>
        </SheetHeader>
        {entry ? (
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <LogEventSummary entry={entry} />
            {log?.hasPayload && detail.isPending ? (
              <p className="text-muted-foreground text-sm" role="status">
                {t("loadingContext")}
              </p>
            ) : null}
            {detail.isError ? (
              <div className="space-y-2" role="alert">
                <p className="text-sm wrap-break-word">
                  {detail.error.message}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => detail.refetch()}
                >
                  {t("retry")}
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
                copyTextToClipboard(JSON.stringify(entry, null, 2), t("copied"))
              }
            >
              <HugeiconsIcon icon={Copy01Icon} className="size-4" />
              {t("copy")}
            </Button>
            {destination ? (
              <Button
                render={<Link href={destination.href} />}
                nativeButton={false}
                onClick={() => onOpenChange(false)}
              >
                {destination.labelKey === "manageIntegration"
                  ? tLabels("manageIntegration")
                  : t(`destinations.${destination.labelKey}`)}
              </Button>
            ) : null}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
