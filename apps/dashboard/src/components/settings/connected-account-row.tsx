"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import type { ConnectedAccountRowProps } from "@/types/settings/account";

export function ConnectedAccountRow({
  canUnlink,
  disconnectHint,
  icon,
  linked,
  loading,
  name,
  onLink,
  onUnlink,
}: ConnectedAccountRowProps) {
  const t = useTranslations("settings.connectedAccounts");
  const tCommon = useTranslations("common.actions");
  const linkedLabel = disconnectHint ?? t("connectedTo", { provider: name });

  return (
    <div className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{name}</p>
          <p className="text-muted-foreground text-xs">
            {linked ? linkedLabel : t("signInWith", { provider: name })}
          </p>
        </div>
      </div>
      {linked ? (
        <Button
          className="shrink-0 self-start sm:self-auto"
          disabled={!canUnlink}
          loading={loading}
          onClick={onUnlink}
          size="sm"
          variant="outline"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={16} />
          {tCommon("disconnect")}
        </Button>
      ) : (
        <Button
          className="shrink-0 self-start sm:self-auto"
          loading={loading}
          onClick={onLink}
          size="sm"
          variant="outline"
        >
          {tCommon("connect")}
        </Button>
      )}
    </div>
  );
}
