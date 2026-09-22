import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";

import { Button } from "@/components/button";
import { PageContainer } from "@/components/layout/container";

import { GoogleSearchConsolePageSkeleton } from "./skeleton";

export default function Loading() {
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Google Search Console
            </h1>
            <p className="text-muted-foreground">
              Turn the search queries you already rank for into AI prompt
              suggestions
            </p>
          </div>
          <Button className="gap-1.5" disabled>
            <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
            Connect Search Console
            <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
          </Button>
        </div>
        <GoogleSearchConsolePageSkeleton />
      </div>
    </PageContainer>
  );
}
