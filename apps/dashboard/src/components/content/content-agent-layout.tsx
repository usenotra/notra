"use client";

import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import Link from "next/link";

import { ContentChatActivityPanel } from "@/components/content/content-chat-activity-panel";
import { RightPanelPortal } from "@/components/dashboard/right-panel-portal";
import {
  ACTIVITY_PANEL_CLASSNAME,
  ACTIVITY_PANEL_FRAME_CLASSNAME,
  ACTIVITY_PANEL_OPEN_WIDTH_CLASSNAME,
} from "@/constants/content-detail";
import { cn } from "@/lib/utils";
import type {
  ContentAgentPanelProps,
  ContentBackLinkProps,
  ContentComposerDockProps,
  ContentSaveBarProps,
} from "@/types/content/agent-layout";

export function ContentAgentPanel({
  isOpen,
  hasOpened,
  children,
  ...props
}: ContentAgentPanelProps) {
  return (
    <RightPanelPortal>
      <aside
        aria-hidden={!isOpen}
        className={cn(
          ACTIVITY_PANEL_CLASSNAME,
          isOpen ? ACTIVITY_PANEL_OPEN_WIDTH_CLASSNAME : "w-0"
        )}
        inert={isOpen ? undefined : true}
      >
        {hasOpened ? (
          <div className={ACTIVITY_PANEL_FRAME_CLASSNAME}>
            <ContentChatActivityPanel {...props}>
              <div className="shrink-0 p-2 pt-1">{children}</div>
            </ContentChatActivityPanel>
          </div>
        ) : null}
      </aside>
    </RightPanelPortal>
  );
}

export function ContentComposerDock({
  children,
  isPanelOpen,
  sidebarState,
}: ContentComposerDockProps) {
  return (
    <div
      className={`fixed right-0 bottom-0 left-0 mx-auto w-full max-w-2xl px-4 pb-4 md:w-auto ${sidebarState === "collapsed" ? "md:left-14" : "md:left-64"} ${isPanelOpen ? "lg:hidden" : ""}`}
    >
      {children}
    </div>
  );
}

export function ContentSaveBar({
  hasChanges,
  isPanelOpen,
  sidebarState,
  onSave,
  onDiscard,
}: ContentSaveBarProps) {
  if (!hasChanges || !isPanelOpen) {
    return null;
  }
  return (
    <div
      className={`pointer-events-none fixed bottom-4 left-0 z-50 hidden lg:right-96 lg:block ${sidebarState === "collapsed" ? "lg:left-14" : "lg:left-64"}`}
    >
      <div className="pointer-events-auto mx-auto w-full max-w-xl px-4">
        <div
          className="border-border bg-background rounded-[14px] border p-0.5 shadow-sm"
          data-save-bar
        >
          <div className="bg-background flex items-center gap-3 rounded-lg py-2 pr-2 pl-4">
            <span className="text-muted-foreground flex-1 text-sm">
              You have unsaved changes
            </span>
            <Button onClick={onDiscard} size="sm" variant="ghost">
              Discard
            </Button>
            <Button onClick={onSave} size="sm">
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContentBackLink({
  organizationSlug,
  collectionId,
}: ContentBackLinkProps) {
  const href = collectionId
    ? `/${organizationSlug}/collection/${collectionId}`
    : `/${organizationSlug}/content`;
  return (
    <Link
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex w-fit items-center gap-1.5 rounded-sm text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
      href={href}
    >
      <HugeiconsIcon className="size-4" icon={ArrowLeft02Icon} />
      {collectionId ? "Back to collection" : "Back to Content"}
    </Link>
  );
}
