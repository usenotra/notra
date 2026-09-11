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
import { Slack } from "@notra/ui/components/ui/svgs/slack";
import type React from "react";
import { isValidElement, useState } from "react";

import { Button } from "@/components/button";
import { INTEGRATION_PROVIDERS } from "@/constants/integration-analytics";
import { flushTrackEvent } from "@/lib/analytics/posthog-client";
import type { AddSlackIntegrationDialogProps } from "@/types/slack-integration";

export function AddSlackIntegrationDialog({
  authorizeUrl,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: AddSlackIntegrationDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const triggerElement = isValidElement(trigger) ? (
    <ResponsiveDialogTrigger render={trigger} />
  ) : null;

  return (
    <ResponsiveDialog onOpenChange={setOpen} open={open}>
      {triggerElement}
      <ResponsiveDialogContent className="sm:max-w-[520px]">
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-3">
            <Slack className="size-7" />
            <div>
              <ResponsiveDialogTitle className="text-xl">
                Add Slack Integration
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Install the Notra agent in your Slack workspace to chat, draft,
                and approve content from Slack threads.
              </ResponsiveDialogDescription>
            </div>
          </div>
        </ResponsiveDialogHeader>
        <div className="space-y-3 py-4">
          <p className="text-muted-foreground text-sm">
            You will be redirected to Slack to approve the installation. Public
            threads with the agent are mirrored into the dashboard, and you can
            limit which channels the agent responds in after connecting.
          </p>
        </div>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose render={<Button variant="outline" />}>
            Cancel
          </ResponsiveDialogClose>
          <Button
            onClick={() => {
              void flushTrackEvent(POSTHOG_EVENTS.INTEGRATION_CONNECT_STARTED, {
                provider: INTEGRATION_PROVIDERS.SLACK,
              }).finally(() => {
                window.location.href = authorizeUrl;
              });
            }}
          >
            Add to Slack
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
