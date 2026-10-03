"use client";

import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { SITE_COPY_FEEDBACK_MS } from "@/constants/sites";
import { cn } from "@/lib/utils";
import type { SiteCopyButtonProps } from "@/types/sites";

/** Icon button that copies a value and confirms with a check and a "Copied" tooltip. */
export function SiteCopyButton({
  value,
  label,
  className,
}: SiteCopyButtonProps) {
  const tCommon = useTranslations("common");
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    []
  );

  const copy = async () => {
    if (!navigator.clipboard?.writeText) {
      toast.error(tCommon("toasts.clipboardUnsupported"));
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      toast.error(tCommon("toasts.copyFailed"));
      return;
    }
    setCopied(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(
      () => setCopied(false),
      SITE_COPY_FEEDBACK_MS
    );
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={
              copied
                ? tCommon("labels.labelCopied", { label })
                : tCommon("labels.copyLabel", { label })
            }
            className={cn("shrink-0", className)}
            onClick={copy}
            size="icon-xs"
            type="button"
            variant="ghost"
          />
        }
      >
        <HugeiconsIcon
          className="size-3.5"
          icon={copied ? Tick02Icon : Copy01Icon}
          strokeWidth={1.5}
        />
      </TooltipTrigger>
      <TooltipContent>
        {copied ? tCommon("actions.copied") : tCommon("actions.copy")}
      </TooltipContent>
    </Tooltip>
  );
}
