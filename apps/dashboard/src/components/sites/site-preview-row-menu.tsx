"use client";

import {
  Delete02Icon,
  Link04Icon,
  MoreHorizontalIcon,
  Rocket01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import type { SitePreviewRowMenuProps } from "@/types/components/sites";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";

export function SitePreviewRowMenu({
  row,
  onCopyShareLink,
  onViewDeployment,
  onDelete,
}: SitePreviewRowMenuProps) {
  const t = useTranslations("sites.previewsPage");
  const tCommon = useTranslations("common");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={t("actionsLabel", {
              name: row.branch ?? row.previewKey,
            })}
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {row.visibility === "protected" ? (
          <DropdownMenuItem onClick={onCopyShareLink}>
            <HugeiconsIcon icon={Link04Icon} size={14} strokeWidth={1.5} />
            {t("copyShareLink")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            disabled={!row.served}
            onClick={() =>
              copyTextToClipboard(row.url, tCommon("toasts.copied"))
            }
          >
            <HugeiconsIcon icon={Link04Icon} size={14} strokeWidth={1.5} />
            {t("copyLink")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onViewDeployment}>
          <HugeiconsIcon icon={Rocket01Icon} size={14} strokeWidth={1.5} />
          {t("viewDeployment")}
        </DropdownMenuItem>
        {row.served ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} variant="destructive">
              <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.5} />
              {t("delete")}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
