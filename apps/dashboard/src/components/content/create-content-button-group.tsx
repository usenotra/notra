"use client";

import {
  ArrowDown01Icon,
  NoteAddIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Kbd } from "@notra/ui/components/ui/kbd";

import { Button } from "@/components/button";
import type { CreateContentButtonGroupProps } from "@/types/content/create-post";

export function CreateContentButtonGroup({
  disabled = false,
  onCreateContent,
  onCreatePost,
  onPrefetchCreateContent,
  onPrefetchCreatePost,
}: CreateContentButtonGroupProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        disabled={disabled}
        onClick={onCreateContent}
        onFocus={onPrefetchCreateContent}
        onMouseEnter={onPrefetchCreateContent}
      >
        <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
        Create Content
        <Kbd className="hidden sm:inline-flex">C</Kbd>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label="More ways to create content"
              disabled={disabled}
              onFocus={onPrefetchCreatePost}
              onMouseEnter={onPrefetchCreatePost}
              size="icon"
              variant="outline"
            />
          }
        >
          <HugeiconsIcon className="size-4" icon={ArrowDown01Icon} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onCreatePost}>
            <HugeiconsIcon className="size-4" icon={NoteAddIcon} />
            Empty post
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
