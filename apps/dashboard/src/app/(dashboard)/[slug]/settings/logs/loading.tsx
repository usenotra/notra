import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "next-intl";

import { PageContainer } from "@/components/layout/container";

import { LogsPageSkeleton } from "./skeleton";

export default function Loading() {
  const t = useTranslations("settings.logs");
  const tCommon = useTranslations("common");
  return (
    <PageContainer
      className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6"
      variant="default"
    >
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {tCommon("labels.logs")}
            </h1>
            <HugeiconsIcon
              className="text-muted-foreground size-4"
              icon={InformationCircleIcon}
            />
          </div>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Skeleton className="h-9 w-full sm:flex-1" />
          <Skeleton className="h-9 w-full sm:w-44" />
          <Skeleton className="h-9 w-full sm:w-40" />
        </div>
        <LogsPageSkeleton />
      </div>
    </PageContainer>
  );
}
