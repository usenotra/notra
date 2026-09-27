"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Google } from "@notra/ui/components/ui/svgs/google";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/button";
import { flushTrackEvent } from "@/lib/analytics/posthog-client";
import type { GoogleSearchConsoleConnectDialogProps } from "@/types/integrations/pages";

export function AddGoogleSearchConsoleIntegrationDialog({
  authorizeUrl,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  reauth = false,
}: GoogleSearchConsoleConnectDialogProps) {
  const t = useTranslations("integrations.gscDialog");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon = useTranslations("common");
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  return (
    <ResponsiveDialog onOpenChange={setOpen} open={open}>
      <ResponsiveDialogContent className="sm:max-w-[520px]">
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-3">
            <Google className="size-7" />
            <div>
              <ResponsiveDialogTitle className="text-xl">
                {reauth ? t("titleReconnect") : t("titleConnect")}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {t("description")}
              </ResponsiveDialogDescription>
            </div>
          </div>
        </ResponsiveDialogHeader>
        <div className="space-y-3 py-4">
          <p className="text-muted-foreground text-sm">{t("redirectNote")}</p>
        </div>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose render={<Button variant="outline" />}>
            {tCommon("actions.cancel")}
          </ResponsiveDialogClose>
          <Button
            onClick={() => {
              void flushTrackEvent(POSTHOG_EVENTS.GSC_CONNECT_STARTED, {
                is_reconnect: reauth,
              }).finally(() => {
                window.location.href = authorizeUrl;
              });
            }}
          >
            {reauth
              ? tIntegrationsShared("reconnect")
              : tCommon("actions.connect")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
