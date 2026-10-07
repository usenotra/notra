import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import type { GeoPromptDetailStatusProps } from "@/types/geo-prompt-detail";

export function PromptDetailStatus({
  status,
  onRetry,
}: GeoPromptDetailStatusProps) {
  const t = useTranslations("geo.promptDetailStatus");
  const tCommon = useTranslations("common.actions");
  if (status === "loading") {
    return (
      <p className="text-muted-foreground p-6 text-sm" role="status">
        {t("loading")}
      </p>
    );
  }
  return (
    <div className="space-y-3 p-6">
      <p className="text-muted-foreground text-sm" role="status">
        {status === "error" ? t("error") : t("unavailable")}
      </p>
      {status === "error" ? (
        <Button onClick={onRetry} type="button" variant="outline">
          {tCommon("tryAgain")}
        </Button>
      ) : null}
    </div>
  );
}
