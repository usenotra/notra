import { PageContainer } from "@/components/layout/container";

import { CompetitorDetailSkeleton } from "../skeleton";

export default function Loading() {
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full px-4 lg:px-6">
        <CompetitorDetailSkeleton />
      </div>
    </PageContainer>
  );
}
