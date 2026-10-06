import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { PageContainer } from "@/components/layout/container";

import { SchedulePageSkeleton } from "./skeleton";

export default function Loading() {
  const t = useTranslations("automation.schedules.page");
  const tCommon = useTranslations("common");
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading
          description={t("description")}
          title={tCommon("labels.schedules")}
        >
          <Button className="gap-1.5">
            <HugeiconsIcon className="size-4" icon={Add01Icon} />
            {t("create")}
            <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
          </Button>
        </PageHeading>
        <SchedulePageSkeleton />
      </div>
    </PageContainer>
  );
}
