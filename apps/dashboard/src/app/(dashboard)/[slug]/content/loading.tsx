import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "use-intl";

import { PageContainer } from "@/components/layout/container";
import { PageHeading } from "@/components/layout/page-heading";

import { CollectionsPageSkeleton } from "./skeleton";

export default function Loading() {
  const t = useTranslations("content.list");
  const tCommon = useTranslations("common");
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading
          description={t("loadingDescription")}
          title={tCommon("labels.content")}
        >
          <Skeleton className="h-9 w-40 rounded-md" />
        </PageHeading>
        <CollectionsPageSkeleton />
      </div>
    </PageContainer>
  );
}
