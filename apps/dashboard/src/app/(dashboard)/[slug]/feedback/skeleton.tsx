import { Skeleton } from "@notra/ui/components/ui/skeleton";

import { AgentFeedbackTableSkeleton } from "@/components/agent-feedback/feedback-table";
import { PageContainer } from "@/components/layout/container";

export function AgentFeedbackPageSkeleton() {
  return (
    <PageContainer className="flex h-full min-h-full flex-1 flex-col overflow-hidden py-4 md:py-6">
      <div className="flex min-h-0 w-full flex-1 flex-col gap-6 px-4 lg:px-6">
        <div className="shrink-0 space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Feedback</h1>
          <p className="text-muted-foreground">
            What AI agents are saying about your product.
          </p>
        </div>
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
