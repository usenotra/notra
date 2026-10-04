"use client";

import {
  Image01Icon,
  PlusSignIcon,
  Video01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import type { RefObject } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import {
  OPEN_CONTENT_IMAGE_UPLOAD_COMMAND,
  OPEN_CONTENT_VIDEO_UPLOAD_COMMAND,
} from "@/components/content/editor/plugins/content-media-commands";
import type { EditorRefHandle } from "@/components/content/editor/plugins/editor-ref-plugin";

export function ContentEditorMediaInsert({
  editorRef,
}: {
  editorRef: RefObject<EditorRefHandle | null>;
}) {
  const t = useTranslations("content.editor.media");
  const tCommon = useTranslations("common");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={t("addMedia")}
            className="shrink-0"
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <HugeiconsIcon
          aria-hidden="true"
          className="text-muted-foreground group-hover/button:text-foreground group-aria-expanded/button:text-foreground size-4"
          icon={PlusSignIcon}
          strokeWidth={2}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem
          onClick={() => {
            editorRef.current?.dispatchCommand(
              OPEN_CONTENT_IMAGE_UPLOAD_COMMAND,
              undefined
            );
          }}
        >
          <HugeiconsIcon
            aria-hidden="true"
            className="size-4"
            icon={Image01Icon}
            strokeWidth={2}
          />
          {tCommon("labels.image")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            editorRef.current?.dispatchCommand(
              OPEN_CONTENT_VIDEO_UPLOAD_COMMAND,
              undefined
            );
          }}
        >
          <HugeiconsIcon
            aria-hidden="true"
            className="size-4"
            icon={Video01Icon}
            strokeWidth={2}
          />
          {tCommon("labels.video")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
