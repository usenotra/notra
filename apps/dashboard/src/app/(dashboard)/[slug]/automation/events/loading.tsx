import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";

import { EventsPageSkeleton } from "@/components/automation/events-skeleton";
import { Button } from "@/components/button";
import { PageContainer } from "@/components/layout/container";
import { PageHeading } from "@/components/layout/page-heading";

export default function Loading() {
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading
          description="React to GitHub activity and trigger content generation automatically"
          title="Events"
        >
          <Button className="gap-1.5">
            <HugeiconsIcon className="size-4" icon={Add01Icon} />
            Create Trigger
            <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
          </Button>
        </PageHeading>
        <EventsPageSkeleton />
      </div>
    </PageContainer>
  );
}
