import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "use-intl";

import { PageContainer } from "@/components/layout/container";

import { IntegrationsPageSkeleton } from "./skeleton";

export default function Loading() {
  const t = useTranslations("integrations.overview");
  const tCommon = useTranslations("common");

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading
          description={t("description")}
          title={tCommon("labels.integrations")}
        />
        <div>
          <div className="flex gap-6 border-b pb-3">
            <Skeleton className="h-5 w-8" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="pt-4">
            <IntegrationsPageSkeleton />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
