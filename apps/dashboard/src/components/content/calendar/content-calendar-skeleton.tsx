import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "next-intl";

/**
 * Stands in for the calendar while its chunk loads. No dates: it also renders
 * on the server, which does not know the browser's time zone.
 */
export function ContentCalendarSkeleton() {
  const tContentShared = useTranslations("content.shared");
  return (
    <div
      aria-label={tContentShared("loadingContent")}
      className="space-y-3"
      role="status"
    >
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-8 w-52 rounded-lg" />
      </div>
      <Skeleton className="h-[38rem] w-full rounded-2xl max-sm:h-[24rem]" />
    </div>
  );
}
