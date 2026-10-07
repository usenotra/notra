import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { Kbd } from "@notra/ui/components/ui/kbd";
import type { ReactNode } from "react";

import { Button } from "@/components/button";
import { DesignSystemSectionHeader } from "@/components/design-system/design-system-section-header";

const DESCRIPTION =
  "Scheduled content runs on autopilot. Pick a cadence, a source and where drafts should land.";

function HeadingFrame({
  label,
  narrow = false,
  children,
}: {
  label: string;
  narrow?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <div
        className={
          narrow
            ? "bg-background @container/main w-full max-w-sm rounded-xl border p-4"
            : "bg-background @container/main rounded-xl border p-6"
        }
      >
        {children}
      </div>
    </div>
  );
}

function NewScheduleButton() {
  return (
    <Button>
      <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
      New schedule
      <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
    </Button>
  );
}

export function PageHeadingSection() {
  return (
    <section className="scroll-mt-10 space-y-6" id="page-heading">
      <DesignSystemSectionHeader
        description="Shared page title from @notra/ui. Stacks below a 40rem @container/main and puts actions beside the title above it."
        id="page-heading"
        title="Page Heading"
      />
      <div className="space-y-6">
        <HeadingFrame label="Title only">
          <PageHeading title="Good morning, Jan" />
        </HeadingFrame>
        <HeadingFrame label="Title and description">
          <PageHeading description={DESCRIPTION} title="Schedules" />
        </HeadingFrame>
        <HeadingFrame label="With actions">
          <PageHeading description={DESCRIPTION} title="Schedules">
            <NewScheduleButton />
          </PageHeading>
        </HeadingFrame>
        <HeadingFrame label="Narrow container (24rem)" narrow>
          <PageHeading description={DESCRIPTION} title="Schedules">
            <NewScheduleButton />
          </PageHeading>
        </HeadingFrame>
      </div>
    </section>
  );
}
