"use client";

import { Copy01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import {
  CONTENT_SHARE_OPTIONS,
  getContentShareOption,
  isPostVisibility,
} from "@/constants/content-share";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { ContentShareMenuProps } from "@/types/content-share";
import { resolveContentShareHref } from "@/utils/content-share";

export function ContentShareMenu({
  content,
  contentId,
  organizationId,
  organizationSlug,
}: ContentShareMenuProps) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const currentOption = getContentShareOption(content.visibility);

  const shareHref = () =>
    resolveContentShareHref({
      origin: window.location.origin,
      visibility: content.visibility,
      shareToken: content.shareToken,
      organizationSlug,
      contentId,
    });

  const handleVisibilityChange = (value: string) => {
    if (!isPostVisibility(value) || value === content.visibility) {
      return;
    }

    startTransition(async () => {
      try {
        await dashboardOrpc.content.update.call({
          organizationId,
          contentId,
          visibility: value,
        });
        await queryClient.invalidateQueries({
          queryKey: dashboardOrpc.content.get.queryKey({
            input: { organizationId, contentId },
          }),
        });
        toast.success(
          CONTENT_SHARE_OPTIONS.find((option) => option.value === value)
            ?.label ?? "Sharing updated"
        );
      } catch {
        toast.error("Failed to update sharing");
      }
    });
  };

  const handleCopyLink = () => {
    void navigator.clipboard
      .writeText(shareHref())
      .then(() => toast.success("Link copied"))
      .catch(() => toast.error("Failed to copy link"));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        render={<Button size="icon-sm" variant="outline" />}
      >
        <span className="sr-only">Share, {currentOption.label}</span>
        <HugeiconsIcon className="size-4" icon={currentOption.icon} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuRadioGroup
          onValueChange={handleVisibilityChange}
          value={content.visibility}
        >
          {CONTENT_SHARE_OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              closeOnClick
              disabled={isPending}
              key={option.value}
              value={option.value}
            >
              <span className="flex items-start gap-2 py-0.5">
                <HugeiconsIcon className="mt-0.5 size-4" icon={option.icon} />
                <span className="flex min-w-0 flex-col">
                  <span>{option.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {option.description}
                  </span>
                </span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isPending} onClick={handleCopyLink}>
          <HugeiconsIcon className="size-4" icon={Copy01Icon} />
          Copy link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
