import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { SITE_INTEGRATION_AUTOSAVE_MESSAGES } from "@/constants/site-integrations";
import type { SiteIntegrationSaveStatusProps } from "@/types/components/sites";
import { toErrorMessage } from "@/utils/error-message";

export function SiteIntegrationSaveStatus({
  state,
  invalid,
  busy,
  onRetry,
}: SiteIntegrationSaveStatusProps) {
  const t = useTranslations("sites.integrationsPage");
  const failed = state.status === "error";
  const message = failed
    ? toErrorMessage(state.error, t("saveFailed"))
    : t(
        invalid && state.dirty
          ? "autosaveInvalid"
          : SITE_INTEGRATION_AUTOSAVE_MESSAGES[state.status]
      );

  return (
    <div aria-live="polite" className="shrink-0 space-y-2" role="status">
      <p
        className={
          failed ? "text-destructive text-sm" : "text-muted-foreground text-sm"
        }
      >
        {message}
      </p>
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
