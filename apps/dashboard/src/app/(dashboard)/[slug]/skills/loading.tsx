import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "use-intl";

import { PageContainer } from "@/components/layout/container";

import { SkillsPageSkeleton } from "./skeleton";

export default function Loading() {
  const t = useTranslations("skills");
  const tCommon = useTranslations("common");
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading
          description={t("description")}
          title={tCommon("labels.skills")}
        >
          <Skeleton className="h-9 w-36 rounded-md" />
        </PageHeading>
        <SkillsPageSkeleton />
      </div>
    </PageContainer>
  );
}
