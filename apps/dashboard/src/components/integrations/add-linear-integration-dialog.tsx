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
  ResponsiveDialogTrigger,
} from "@notra/ui/components/shared/responsive-dialog";
import { Linear } from "@notra/ui/components/ui/svgs/linear";
import { useTranslations } from "next-intl";
import type React from "react";
import { isValidElement, useState } from "react";

import { Button } from "@/components/button";
import { INTEGRATION_PROVIDERS } from "@/constants/integration-analytics";
import { flushTrackEvent } from "@/lib/analytics/posthog-client";

interface AddLinearIntegrationDialogProps {
  authorizeUrl: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function AddLinearIntegrationDialog({
  authorizeUrl,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: AddLinearIntegrationDialogProps) {
  const t = useTranslations("integrations.linearDialog");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon = useTranslations("common");
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const triggerElement =
    trigger && isValidElement(trigger) ? (
      <ResponsiveDialogTrigger render={trigger as React.ReactElement} />
    ) : null;

  return (
    <ResponsiveDialog onOpenChange={setOpen} open={open}>
      {triggerElement}
      <ResponsiveDialogContent className="sm:max-w-[520px]">
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-3">
            <Linear className="size-7" />
            <div>
              <ResponsiveDialogTitle className="text-xl">
                {t("title")}
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
              void flushTrackEvent(POSTHOG_EVENTS.INTEGRATION_CONNECT_STARTED, {
                provider: INTEGRATION_PROVIDERS.LINEAR,
              }).finally(() => {
                window.location.href = authorizeUrl;
              });
            }}
          >
            {tIntegrationsShared("addIntegration")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
