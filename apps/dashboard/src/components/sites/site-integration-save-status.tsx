import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { SITE_INTEGRATION_AUTOSAVE_MESSAGES } from "@/constants/site-integrations";
import type { SiteIntegrationSaveStatusProps } from "@/types/components/sites";
import { toErrorMessage } from "@/utils/error-message";

export function SiteIntegrationSaveStatus({
  state,
  invalid,
  busy,
  removalFailed,
  onRetry,
}: SiteIntegrationSaveStatusProps) {
  const t = useTranslations("sites.integrationsPage");
  const failed = state.status === "error";
  const messageKey =
    invalid && state.dirty
      ? "autosaveInvalid"
      : SITE_INTEGRATION_AUTOSAVE_MESSAGES[state.status];
  const message = failed
    ? toErrorMessage(state.error, t("saveFailed"))
    : messageKey
      ? t(messageKey)
      : null;

  if (!message && !removalFailed) {
    return null;
  }

  return (
    <div aria-live="polite" className="shrink-0 space-y-2" role="status">
      {message ? (
        <p
          className={
            failed
              ? "text-destructive text-sm"
              : "text-muted-foreground text-sm"
          }
        >
          {message}
        </p>
      ) : null}
      {removalFailed ? (
        <p className="text-muted-foreground text-sm">
          {t("removeFailedDescription")}
        </p>
      ) : null}
      {failed ? (
        <Button
          disabled={busy}
          onClick={onRetry}
          size="sm"
          type="button"
          variant="outline"
        >
          {t("retry")}
        </Button>
      ) : null}
    </div>
  );
}
