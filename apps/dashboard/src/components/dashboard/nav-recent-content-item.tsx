"use client";

import {
  Copy01Icon,
  Delete02Icon,
  LinkSquare02Icon,
  SentIcon,
  TextIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@notra/ui/components/shared/responsive-alert-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@notra/ui/components/ui/context-menu";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@notra/ui/components/ui/sidebar";
import { cn } from "@notra/ui/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  NAV_RECENT_TITLE_CLASS,
  POST_STATUS_DOT_CLASS,
  POST_STATUS_LABELS,
} from "@/constants/nav";
import { usePostActions } from "@/lib/hooks/use-post-actions";
import type { NavRecentContentItemProps } from "@/types/components/nav";

import { SidebarNavLink } from "./sidebar-nav-link";

export function NavRecentContentItem({
  href,
  isActive,
  post,
}: NavRecentContentItemProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { deletePost, isDeleting, isTogglingStatus, togglePostStatus } =
    usePostActions(post.organizationId);
  const isPublished = post.status === "published";

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger
          onKeyDown={(event) => {
            if (
              event.key === "ContextMenu" ||
              (event.shiftKey && event.key === "F10")
            ) {
              event.preventDefault();
              const bounds = event.currentTarget.getBoundingClientRect();
              event.currentTarget.dispatchEvent(
                new MouseEvent("contextmenu", {
                  bubbles: true,
                  clientX: bounds.left,
                  clientY: bounds.bottom,
                })
              );
            }
          }}
          render={<SidebarMenuItem />}
        >
          <SidebarMenuButton
            isActive={isActive}
            render={
              <SidebarNavLink href={href}>
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    POST_STATUS_DOT_CLASS[post.status]
                  )}
                />
                <span className={NAV_RECENT_TITLE_CLASS}>{post.title}</span>
                <span className="text-muted-foreground ml-auto shrink-0 text-[0.625rem]">
                  {POST_STATUS_LABELS[post.status]}
                </span>
              </SidebarNavLink>
            }
            size="sm"
          />
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem
            onClick={() => {
              window.open(href, "_blank", "noopener,noreferrer");
            }}
          >
            <HugeiconsIcon className="mr-2 size-4" icon={LinkSquare02Icon} />
            Open in new tab
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              void navigator.clipboard
                .writeText(new URL(href, window.location.origin).toString())
                .then(() => toast.success("Link copied"))
                .catch(() => toast.error("Failed to copy link"));
            }}
          >
            <HugeiconsIcon className="mr-2 size-4" icon={Copy01Icon} />
            Copy link
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            disabled={isTogglingStatus}
            onClick={() => {
              togglePostStatus(post.id, post.status);
            }}
          >
            <HugeiconsIcon
              className="mr-2 size-4"
              icon={isPublished ? TextIcon : SentIcon}
            />
            {isPublished ? "Move to draft" : "Publish"}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            disabled={isDeleting}
            onClick={() => setShowDeleteDialog(true)}
            variant="destructive"
          >
            <HugeiconsIcon className="mr-2 size-4" icon={Delete02Icon} />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <ResponsiveAlertDialog
        onOpenChange={(open) => {
          if (!isDeleting) {
            setShowDeleteDialog(open);
          }
        }}
        open={showDeleteDialog}
      >
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>
              Delete post?
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              This will permanently delete &quot;{post.title}&quot;. This action
              cannot be undone.
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel disabled={isDeleting}>
              Cancel
            </ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              disabled={isDeleting}
              variant="destructive"
              onClick={async () => {
                const deleted = await deletePost(post.id);
                if (deleted) {
                  setShowDeleteDialog(false);
                  if (isActive) {
                    router.replace(href.slice(0, href.lastIndexOf("/")));
                  }
                }
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </>
  );
}
