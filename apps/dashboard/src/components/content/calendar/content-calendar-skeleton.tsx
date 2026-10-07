import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "use-intl";

/**
 * Stands in for the calendar while its chunk loads. No dates: it also renders
 * on the server, which does not know the browser's time zone.
 */
export function ContentCalendarSkeleton() {
  const tContentShared = useTranslations("content.shared");
  return (
    <div aria-label={tContentShared("loadingContent")} role="status">
      <Skeleton className="h-[38rem] w-full rounded-2xl max-sm:h-[24rem]" />
    </div>
  );
}
