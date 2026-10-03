"use client";

import { AiMagicIcon, NoteAddIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { useTranslations } from "next-intl";

import { Button } from "@/components/button";
import type { CreateContentButtonGroupProps } from "@/types/content/create-post";

export function CreateContentButtonGroup({
  disabled = false,
  onCreateContent,
  onCreatePost,
  onPrefetchCreateContent,
  onPrefetchCreatePost,
}: CreateContentButtonGroupProps) {
  const t = useTranslations("content.create.buttons");
  const tCommon = useTranslations("common");
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
        {tCommon("labels.newPost")}
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
        {t("generateContent")}
        <Kbd className="hidden sm:inline-flex">C</Kbd>
      </Button>
    </div>
  );
}
