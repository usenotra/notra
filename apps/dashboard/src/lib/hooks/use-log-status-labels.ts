import { useTranslations } from "use-intl";

import type { WebhookLogStatus } from "@/types/webhooks/webhooks";

export function useLogStatusLabels(): Record<WebhookLogStatus, string> {
  const t = useTranslations("logs.shared");
  const tCommon = useTranslations("common.labels");
  return {
    success: t("success"),
    failed: tCommon("failed"),
    pending: tCommon("pending"),
    skipped: tCommon("skipped"),
  };
}
