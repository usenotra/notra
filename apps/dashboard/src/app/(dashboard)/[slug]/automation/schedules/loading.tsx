import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";

import { Button } from "@/components/button";
import { PageContainer } from "@/components/layout/container";

import { SchedulePageSkeleton } from "./skeleton";

export default function Loading() {
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="flex flex-col items-start gap-3 @min-[40rem]/main:flex-row @min-[40rem]/main:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Schedules</h1>
            <p className="text-muted-foreground">
              Configure cron schedules that run daily, weekly, or monthly
            </p>
          </div>
          <Button className="gap-1.5">
            <HugeiconsIcon className="size-4" icon={Add01Icon} />
            Create Schedule
            <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
          </Button>
        </div>
        <SchedulePageSkeleton />
      </div>
    </PageContainer>
  );
}
