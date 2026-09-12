"use client";

import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import { Github } from "@notra/ui/components/ui/svgs/github";
import type React from "react";
import { isValidElement, useState } from "react";

import { Button } from "@/components/button";
import { GITHUB_APP_PERMISSIONS } from "@/constants/github";
import type { ConnectGitHubDialogProps } from "@/types/integrations/github";

export function ConnectGitHubDialog({
  onConnect,
  isConnecting = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: ConnectGitHubDialogProps) {
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
            <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
              <Github className="size-6" />
            </span>
            <ResponsiveDialogTitle className="text-xl">
              Connect GitHub
            </ResponsiveDialogTitle>
          </div>
          <ResponsiveDialogDescription>
            Install the Notra GitHub App to turn your commits and releases into
            changelogs, blog posts, and more.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-muted-foreground text-sm">
            You will be redirected to GitHub to choose an account or
            organization and select which repositories Notra can access. You can
            change this anytime from GitHub.
          </p>
          <ul className="space-y-2">
            {GITHUB_APP_PERMISSIONS.map((permission) => (
              <li
                className="text-muted-foreground flex items-start gap-2 text-sm"
                key={permission}
              >
                <span className="bg-foreground/40 mt-1.5 size-1.5 shrink-0 rounded-full" />
                {permission}
              </li>
            ))}
          </ul>
        </div>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose
            disabled={isConnecting}
            render={<Button variant="outline" />}
          >
            Cancel
          </ResponsiveDialogClose>
          <Button className="gap-2" disabled={isConnecting} onClick={onConnect}>
            {isConnecting ? (
              <HugeiconsIcon
                className="size-4 animate-spin"
                icon={Loading03Icon}
              />
            ) : (
              <Github className="size-4" />
            )}
            {isConnecting ? "Redirecting…" : "Install on GitHub"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
