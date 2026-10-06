import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "use-intl";

import { AgentFeedbackTableSkeleton } from "@/components/agent-feedback/feedback-table";
import { PageContainer } from "@/components/layout/container";

export function AgentFeedbackPageSkeleton() {
  const t = useTranslations("feedback.page");
  const tCommon = useTranslations("common");
  return (
    <PageContainer className="flex h-full min-h-full flex-1 flex-col overflow-hidden py-4 md:py-6">
      <div className="flex min-h-0 w-full flex-1 flex-col gap-6 px-4 lg:px-6">
        <PageHeading
          description={t("description")}
          title={tCommon("labels.feedback")}
        />
        <div className="bg-muted/40 flex w-fit shrink-0 items-center gap-0.5 rounded-lg border p-0.5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton className="h-7 w-16 rounded-md" key={index} />
          ))}
        </div>
        <div className="min-h-0 flex-1">
          <AgentFeedbackTableSkeleton />
        </div>
      </div>
    </PageContainer>
  );
}
