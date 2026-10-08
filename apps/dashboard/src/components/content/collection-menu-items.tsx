"use client";

import {
  ArrowUpRight01Icon,
  Calendar03Icon,
  Copy01Icon,
  Delete02Icon,
  MoreHorizontalIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import {
  ContextMenuItem,
  ContextMenuSeparator,
} from "@notra/ui/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { useTranslations } from "use-intl";

import Link from "@/components/framework/link";
import type { CollectionMenuItemsProps } from "@/types/content/collection";
import { collectionHref, collectionTitle } from "@/utils/content-collections";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";

export function CollectionMenuItems({
  collection,
  organizationSlug,
  disabled,
  onDelete,
  onSchedule,
  variant = "context",
}: CollectionMenuItemsProps) {
  const t = useTranslations("content.collections.actions");
  const tCommon = useTranslations("common.actions");
  const tSchedule = useTranslations("content.calendar.schedule");
  const Item = variant === "context" ? ContextMenuItem : DropdownMenuItem;
  const Separator =
    variant === "context" ? ContextMenuSeparator : DropdownMenuSeparator;
  const href = collectionHref(organizationSlug, collection);

  return (
    <>
      <Item render={<Link href={href} prefetch={false} />}>
        <HugeiconsIcon aria-hidden="true" icon={ViewIcon} />
        {t("open")}
      </Item>
      <Item
        render={
          <Link
            href={href}
            prefetch={false}
            rel="noopener noreferrer"
            target="_blank"
          />
        }
      >
        <HugeiconsIcon aria-hidden="true" icon={ArrowUpRight01Icon} />
        {t("openInNewTab")}
      </Item>
      <Item
        onClick={() =>
          copyTextToClipboard(
            new URL(href, window.location.origin).href,
            t("linkCopied")
          )
        }
      >
        <HugeiconsIcon aria-hidden="true" icon={Copy01Icon} />
        {t("copyLink")}
      </Item>
      {!collection.isGenerating &&
      collection.postCount === 1 &&
      collection.singlePost &&
      collection.statusSummary.published === 0 ? (
        <Item disabled={disabled} onClick={() => onSchedule(collection)}>
          <HugeiconsIcon aria-hidden="true" icon={Calendar03Icon} />
          {tSchedule("trigger")}
        </Item>
      ) : null}
      <Separator />
      <Item
        disabled={disabled || collection.isGenerating}
        onClick={() => onDelete(collection)}
        variant="destructive"
      >
        <HugeiconsIcon aria-hidden="true" icon={Delete02Icon} />
        {tCommon("delete")}
      </Item>
    </>
  );
}

export function CollectionActionsMenu(props: CollectionMenuItemsProps) {
  const tCommon = useTranslations("common");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={tCommon("labels.actionsForName", {
              name: collectionTitle(props.collection),
            })}
            className="size-8 shrink-0"
            size="icon"
            variant="ghost"
          >
            <HugeiconsIcon aria-hidden="true" icon={MoreHorizontalIcon} />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <CollectionMenuItems {...props} variant="dropdown" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
