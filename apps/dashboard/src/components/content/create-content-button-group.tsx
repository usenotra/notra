"use client";

import { AiMagicIcon, NoteAddIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
    <div className="flex flex-wrap items-center gap-2">
      <Button
        disabled={disabled}
        onClick={onCreatePost}
        onFocus={onPrefetchCreatePost}
        onMouseEnter={onPrefetchCreatePost}
        variant="outline"
      >
        <HugeiconsIcon
          aria-hidden="true"
          className="size-4"
          icon={NoteAddIcon}
        />
        New post
      </Button>
      <Button
        disabled={disabled}
        onClick={onCreateContent}
        onFocus={onPrefetchCreateContent}
        onMouseEnter={onPrefetchCreateContent}
      >
        <HugeiconsIcon
          aria-hidden="true"
          className="size-4"
          icon={AiMagicIcon}
        />
        Generate content
        <Kbd className="hidden sm:inline-flex">C</Kbd>
      </Button>
    </div>
  );
}
