import { Add01Icon, Book01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { Skeleton } from "@notra/ui/components/ui/skeleton";

import { Button } from "@/components/button";
import { PageContainer } from "@/components/layout/container";
import { PageHeading } from "@/components/layout/page-heading";

const SKELETON_ROW_KEYS = ["row-1", "row-2", "row-3", "row-4", "row-5"];

export default function Loading() {
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading
          className="@min-[40rem]/main:items-center"
          description="Manage API keys for programmatic access to your organization"
          title="API Keys"
        >
          <div className="flex items-center gap-2">
            <Button className="gap-1.5">
              <HugeiconsIcon className="size-4" icon={Add01Icon} />
              Create API Key
              <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
            </Button>
            <Button size="icon" variant="outline">
              <HugeiconsIcon className="size-4" icon={Book01Icon} />
            </Button>
          </div>
        </PageHeading>
        <div className="smooth-shadow-ring-xs bg-muted/80 overflow-hidden rounded-lg">
          <div className="bg-background space-y-3 rounded-t-lg p-4">
            {SKELETON_ROW_KEYS.map((key) => (
              <div className="flex items-center gap-4 py-2" key={key}>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <div className="ml-auto">
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
