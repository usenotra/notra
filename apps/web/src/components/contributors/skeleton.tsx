import { Skeleton } from "@notra/ui/components/ui/skeleton";

import { ContributorsSectionHeader } from "@/components/contributors/section-header";
import {
  ACTIVITY_HEADING,
  ACTIVITY_SUBCOPY,
  CONTRIBUTORS_HEADING,
  CONTRIBUTORS_SUBCOPY,
} from "@/constants/contributors";

const CONTRIBUTORS_SKELETON_KEYS = Array.from(
  { length: 12 },
  (_, i) => `contrib-${i}`
);
const ROW_SKELETON_KEYS = ["r1", "r2", "r3", "r4", "r5"] as const;
const CARD_SKELETON_KEYS = ["issues", "prs"] as const;

function ContributorsSkeleton() {
  return (
    <div className="flex w-full max-w-320 flex-wrap justify-center gap-x-5 gap-y-6">
      {CONTRIBUTORS_SKELETON_KEYS.map((key) => (
        <div
          className="flex w-[8.875rem] flex-col items-center gap-2.5 px-1 py-4"
          key={key}
        >
          <Skeleton className="size-16 rounded-full" />
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

function ActivityCardSkeleton() {
  return (
    <div className="flex flex-col gap-7 rounded-[0.8125rem] p-6 [box-shadow:#ECECEC_0rem_0rem_0rem_0.0625rem] sm:p-8.75 dark:[box-shadow:#FFFFFF14_0rem_0rem_0rem_0.0625rem]">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex flex-col rounded-[0.5625rem] [box-shadow:#ECECEC_0rem_0rem_0rem_0.0625rem] dark:[box-shadow:#FFFFFF14_0rem_0rem_0rem_0.0625rem]">
        {ROW_SKELETON_KEYS.map((key) => (
          <div className="flex items-start gap-3 px-4.5 py-4" key={key}>
            <Skeleton className="mt-0.5 size-6 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContributorsPageSkeleton() {
  return (
    <>
      <section className="flex w-full flex-col items-center gap-13.5 px-6 pt-20 antialiased sm:px-12 lg:px-20 lg:pt-35">
        <ContributorsSectionHeader
          description={CONTRIBUTORS_SUBCOPY}
          title={CONTRIBUTORS_HEADING}
        />
        <ContributorsSkeleton />
      </section>
      <section className="mx-auto flex w-full max-w-360 flex-col items-center gap-13.5 px-6 pt-20 pb-20 antialiased sm:px-12 lg:px-20 lg:pt-35 lg:pb-35">
        <ContributorsSectionHeader
          description={ACTIVITY_SUBCOPY}
          title={ACTIVITY_HEADING}
        />
        <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-2">
          {CARD_SKELETON_KEYS.map((key) => (
            <ActivityCardSkeleton key={key} />
          ))}
        </div>
      </section>
    </>
  );
}
