import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTranslations } from "use-intl";

export function ChatHistoryNavLoading() {
  const t = useTranslations("nav.sidebar");
  return (
    <div
      aria-label={t("loadingChatHistory")}
      className="space-y-2 p-3"
      role="status"
    >
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-4/5" />
    </div>
  );
}
