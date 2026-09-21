"use client";

import {
  Delete02Icon,
  MoreVerticalIcon,
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
import { Badge } from "@notra/ui/components/ui/badge";
import { Button } from "@notra/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import { memo, useState } from "react";

import { BLOG_POST_SUBTYPE_LABELS } from "@/constants/content-formats";
import { usePostActions } from "@/lib/hooks/use-post-actions";
import { cn } from "@/lib/utils";
import type { ContentCardProps, ContentCardType } from "@/types/content/card";
import { isBlogPostSubtype } from "@/utils/content-subtype";
import { formatSnakeCaseLabel } from "@/utils/format";
import { OutputTypeIcon } from "@/utils/output-types";

const CONTENT_TYPES = [
  "changelog",
  "blog_post",
  "twitter_post",
  "linkedin_post",
  "investor_update",
  "image",
] as const satisfies readonly ContentCardType[];

function getContentSubtypeLabel(
  contentSubtype: string | null | undefined
): string | null {
  if (!contentSubtype) {
    return null;
  }
  return isBlogPostSubtype(contentSubtype)
    ? BLOG_POST_SUBTYPE_LABELS[contentSubtype]
    : formatSnakeCaseLabel(contentSubtype);
}

function getContentTypeLabel(contentType: string): string {
  if (contentType === "twitter_post") {
    return "tweet";
  }

  return formatSnakeCaseLabel(contentType);
}

function ContentCardEmptyPreview() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-3 pt-2 pb-4 text-center">
      <span
        aria-hidden="true"
        className="relative isolate flex size-8 items-center justify-center"
      >
        <span className="border-border/60 bg-card absolute inset-0 -z-10 origin-bottom-left -translate-x-1 scale-85 -rotate-10 rounded-md border" />
        <span className="border-border/60 bg-card absolute inset-0 -z-10 origin-bottom-right translate-x-1 scale-85 rotate-10 rounded-md border" />
        <span className="border-border/80 bg-card text-foreground relative flex size-8 items-center justify-center rounded-md border shadow-xs">
          <HugeiconsIcon className="size-4" icon={TextIcon} />
        </span>
      </span>
      <p className="text-muted-foreground text-xs font-medium">
        Nothing written yet
      </p>
    </div>
  );
}

function renderCardPreview({
  hasImagePreview,
  imagePreviewSrc,
  isEmptyDocument,
  previewText,
  title,
}: {
  hasImagePreview: boolean;
  imagePreviewSrc?: string | null;
  isEmptyDocument: boolean;
  previewText: string;
  title: string;
}) {
  if (hasImagePreview && imagePreviewSrc) {
    return (
      <div className="flex flex-1 items-center justify-center overflow-hidden px-3 pb-3">
        <Image
          alt={title}
          className="h-full max-h-full w-full rounded-md object-contain"
          height={630}
          src={imagePreviewSrc}
          unoptimized
          width={1200}
        />
      </div>
    );
  }

  if (isEmptyDocument) {
    return <ContentCardEmptyPreview />;
  }

  return (
    <p className="text-muted-foreground line-clamp-3 px-3 pb-3 text-sm">
      {previewText}
    </p>
  );
}

const ContentCard = memo(function ContentCard({
  id,
  title,
  preview,
  contentType,
  contentSubtype,
  status,
  organizationId,
  className,
  href,
  imagePreviewSrc,
}: ContentCardProps) {
  const subtypeLabel = getContentSubtypeLabel(contentSubtype);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { deletePost, isDeleting, isTogglingStatus, togglePostStatus } =
    usePostActions(organizationId);

  async function handleDelete() {
    const deleted = await deletePost(id);
    if (deleted) {
      setShowDeleteDialog(false);
    }
  }

  const hasImagePreview = contentType === "image" && Boolean(imagePreviewSrc);
  const previewText = preview.trim();
  const isEmptyDocument = !(hasImagePreview || previewText);

  const cardContent = (
    <div
      className={cn(
        "group border-border/80 border-b-border/40 bg-muted/80 relative flex flex-col gap-1.5 rounded-xl border p-1.5 shadow-2xs",
        "h-full transition-colors",
        href && "hover:border-border cursor-pointer",
        className
      )}
    >
      <div className="border-border/60 bg-background flex min-h-28 flex-1 flex-col overflow-hidden rounded-lg border">
        <div className="flex items-start justify-between gap-2 px-3 pt-2.5 pb-1.5">
          <p className="line-clamp-2 min-w-0 text-sm leading-snug font-medium">
            {title}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    className="text-muted-foreground hover:text-foreground -mt-0.5 -mr-1 size-7 p-0"
                    onClick={(e) => e.preventDefault()}
                    variant="ghost"
                  >
                    <span className="sr-only">Open menu</span>
                    <HugeiconsIcon className="size-4" icon={MoreVerticalIcon} />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  disabled={isTogglingStatus}
                  onClick={(e) => {
                    e.preventDefault();
                    togglePostStatus(id, status);
                  }}
                >
                  <HugeiconsIcon
                    className="mr-2 size-4"
                    icon={status === "published" ? TextIcon : SentIcon}
                  />
                  {status === "published" ? "Move to draft" : "Publish"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={isDeleting}
                  onClick={(e) => {
                    e.preventDefault();
                    setShowDeleteDialog(true);
                  }}
                  variant="destructive"
                >
                  <HugeiconsIcon className="mr-2 size-4" icon={Delete02Icon} />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {renderCardPreview({
          hasImagePreview,
          imagePreviewSrc,
          isEmptyDocument,
          previewText,
          title,
        })}
      </div>
      <div className="flex items-center gap-1.5 px-1 pb-0.5">
        <Badge
          className="capitalize"
          variant={status === "published" ? "default" : "outline"}
        >
          {status}
        </Badge>
        <Badge
          className="flex items-center gap-1 capitalize"
          variant="secondary"
        >
          <OutputTypeIcon className="size-3" outputType={contentType} />
          {getContentTypeLabel(contentType)}
        </Badge>
        {subtypeLabel ? <Badge variant="outline">{subtypeLabel}</Badge> : null}
      </div>
    </div>
  );

  return (
    <>
      {href ? (
        <Link
          className="focus-visible:ring-ring block h-full w-full rounded-lg focus-visible:ring-2 focus-visible:outline-none"
          href={href}
        >
          {cardContent}
        </Link>
      ) : (
        cardContent
      )}

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
              This will permanently delete &quot;{title}&quot;. This action
              cannot be undone.
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel disabled={isDeleting}>
              Cancel
            </ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </>
  );
});

export { ContentCard, CONTENT_TYPES, getContentTypeLabel };
export type { ContentCardProps, ContentCardType } from "@/types/content/card";
