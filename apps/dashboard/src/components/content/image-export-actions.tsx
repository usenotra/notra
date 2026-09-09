import { ArrowDown01Icon, Download01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { Button } from "@notra/ui/components/ui/button";
import { ButtonGroup } from "@notra/ui/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { IMAGE_EXPORT_TARGETS } from "@/constants/image-export";
import { localStorageKeys } from "@/constants/storage";
import { IMAGE_EXPORT_DOWNLOAD_TARGET } from "@/constants/studio-analytics";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { cn } from "@/lib/utils";
import type { ImageExportActionsProps } from "@/types/content/detail-toolbar";
import type { ImageExportTarget } from "@/types/content/image-export";
import { getImageExportHtml } from "@/utils/image-content";
import {
  getImageExportTargetLabel,
  isImageExportTarget,
} from "@/utils/image-export";
import { resolveImagePreviewSrc } from "@/utils/markdown-image";

import { ImageExportTargetIcon } from "./image-export-target-icon";

const loadImageExport = () => import("@/lib/content/image-export");

export function ImageExportActions(props: ImageExportActionsProps) {
  const [target, setTarget] = useState<ImageExportTarget>("paper");
  const exportHtml = getImageExportHtml(props.content);
  // Mirrors the source `ImageEditor` renders, so images embedded as Markdown
  // data URLs stay downloadable instead of resolving to `null`.
  const downloadUrl = resolveImagePreviewSrc({
    content: props.content.content,
    markdown: props.content.markdown,
  });

  useEffect(() => {
    const storedTarget = window.localStorage.getItem(
      localStorageKeys.imageExportTarget
    );
    if (
      storedTarget &&
      isImageExportTarget(storedTarget) &&
      storedTarget !== "wonder"
    ) {
      setTarget(storedTarget);
    }
  }, []);

  const selectTarget = (nextTarget: ImageExportTarget) => {
    setTarget(nextTarget);
    window.localStorage.setItem(localStorageKeys.imageExportTarget, nextTarget);
  };

  const copyFor = async (copyTarget: ImageExportTarget) => {
    trackEvent(POSTHOG_EVENTS.IMAGE_EXPORTED, {
      content_id: props.content.id,
      target: copyTarget,
    });
    const imageExport = await loadImageExport().catch(() => {
      toast.error(
        `Failed to copy for ${getImageExportTargetLabel(copyTarget)}`
      );
      return null;
    });
    if (!imageExport) {
      return;
    }
    const { copyImageAsFigma, copyImageAsPaper } = imageExport;
    if (copyTarget === "figma") {
      await copyImageAsFigma(
        props.exportRef.current,
        props.title,
        exportHtml,
        props.content.htmlUrl
      );
    } else {
      await copyImageAsPaper(
        props.exportRef.current,
        props.title,
        exportHtml,
        props.content.htmlUrl
      );
    }
  };
  return (
    <>
      <Button
        onClick={() => {
          trackEvent(POSTHOG_EVENTS.IMAGE_EXPORTED, {
            content_id: props.content.id,
            target: IMAGE_EXPORT_DOWNLOAD_TARGET,
          });
          void loadImageExport()
            .then(({ downloadImage }) =>
              downloadImage(downloadUrl, props.title)
            )
            .catch(() => toast.error("Failed to download image"));
        }}
        size="sm"
        variant="outline"
      >
        <HugeiconsIcon className="size-4" icon={Download01Icon} />
        Download image
      </Button>
      <ButtonGroup>
        <Button onClick={() => copyFor(target)} size="sm" variant="outline">
          <ImageExportTargetIcon className="size-4" target={target} />
          Copy for {getImageExportTargetLabel(target)}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button size="icon-sm" variant="outline" />}
          >
            <span className="sr-only">Select export target</span>
            <HugeiconsIcon className="size-4" icon={ArrowDown01Icon} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuRadioGroup
              onValueChange={(value) => {
                if (!isImageExportTarget(value) || value === "wonder") {
                  return;
                }
                selectTarget(value);
                copyFor(value);
              }}
              value={target}
            >
              {IMAGE_EXPORT_TARGETS.map((target) => {
                const disabled = target === "wonder";
                return (
                  <DropdownMenuRadioItem
                    className={cn("gap-2", disabled && "items-start")}
                    closeOnClick
                    disabled={disabled}
                    key={target}
                    value={target}
                  >
                    <ImageExportTargetIcon
                      className="mt-0.5 size-4"
                      target={target}
                    />
                    <span className="flex flex-col">
                      <span>Copy for {getImageExportTargetLabel(target)}</span>
                      {disabled ? (
                        <span className="text-muted-foreground text-xs">
                          Coming soon
                        </span>
                      ) : null}
                    </span>
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
    </>
  );
}
