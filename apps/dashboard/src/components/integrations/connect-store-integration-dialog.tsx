"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { useTranslations } from "next-intl";

import { Button } from "@/components/button";
import { StoreIntegrationLogo } from "@/components/integrations/store-integration-logo";
import { getStoreIntegrationConnectHint } from "@/lib/integrations/mcp";
import type { ConnectStoreIntegrationDialogProps } from "@/types/integrations/mcp";

export function ConnectStoreIntegrationDialog({
  connecting,
  integration,
  onConnect,
  onOpenChange,
  open,
}: ConnectStoreIntegrationDialogProps) {
  const t = useTranslations("integrations.store");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon = useTranslations("common");
  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border">
              <StoreIntegrationLogo integration={integration} />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5 text-left">
              <ResponsiveDialogTitle className="truncate">
                {tIntegrationsShared("connectName", { name: integration.name })}
              </ResponsiveDialogTitle>
              {integration.author ? (
                <span className="text-muted-foreground truncate text-xs">
                  {t("byAuthor", { author: integration.author })}
                </span>
              ) : null}
            </div>
          </div>
          <ResponsiveDialogDescription className="pt-2 text-left">
            {integration.description ?? t("connectDialog.fallbackDescription")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <p className="text-muted-foreground text-sm">
          {getStoreIntegrationConnectHint(
            t,
            integration.authType,
            integration.name
          )}
        </p>
        <ResponsiveDialogFooter>
          <Button
            disabled={connecting}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            {tCommon("actions.cancel")}
          </Button>
          <Button disabled={connecting} onClick={onConnect}>
            {connecting ? t("connecting") : tCommon("actions.connect")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
