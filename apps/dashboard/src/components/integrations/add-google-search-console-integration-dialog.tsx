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
                {reauth
                  ? "Reconnect Google Search Console"
                  : "Connect Google Search Console"}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Turn the search queries you already rank for into AI prompt
                suggestions.
              </ResponsiveDialogDescription>
            </div>
          </div>
        </ResponsiveDialogHeader>
        <div className="space-y-3 py-4">
          <p className="text-muted-foreground text-sm">
            You will be redirected to Google to authorize read access to Search
            Console. Once authorized, choose which property Notra should sync.
          </p>
        </div>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose render={<Button variant="outline" />}>
            Cancel
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
            {reauth ? "Reconnect" : "Connect"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
