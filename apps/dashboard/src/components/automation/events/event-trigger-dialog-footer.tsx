import {
  Add01Icon,
  AlertCircleIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/button";
import type {
  EventTriggerDialogFooterProps,
  EventTriggerFooterStatusProps,
} from "@/types/automation/event-trigger";

function FooterStatus({
  errorMessage,
  repositoryCount,
}: EventTriggerFooterStatusProps) {
  const t = useTranslations("automation.events.dialog");
  if (errorMessage) {
    return (
      <span className="text-destructive flex items-center gap-1.5 text-xs font-medium">
        <HugeiconsIcon className="size-3.5" icon={AlertCircleIcon} />
        {errorMessage}
      </span>
    );
  }
  return (
    <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
      {repositoryCount === 0
        ? t("noRepositoriesSelected")
        : t("repositoriesSelected", { count: repositoryCount })}
    </span>
  );
}

export function EventTriggerDialogFooter({
  errorMessage,
  isEditMode,
  isPending,
  onCancel,
  repositoryCount,
}: EventTriggerDialogFooterProps) {
  const t = useTranslations("automation.events.dialog");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  return (
    <div className="bg-muted/30 shrink-0 border-t px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <FooterStatus
          errorMessage={errorMessage}
          repositoryCount={repositoryCount}
        />
        <div className="flex items-center gap-2">
          <Button
            disabled={isPending}
            onClick={onCancel}
            size="sm"
            type="button"
            variant="ghost"
          >
            {tCommon("cancel")}
          </Button>
          <Button disabled={isPending} type="submit">
            {isPending ? (
              <>
                <HugeiconsIcon
                  className="size-4 animate-spin"
                  icon={Loading03Icon}
                />
                {isEditMode ? tCommon("saving") : tCommon2("labels.adding")}
              </>
            ) : (
              <>
                <HugeiconsIcon className="size-4" icon={Add01Icon} />
                {isEditMode ? tCommon("saveChanges") : t("add")}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
