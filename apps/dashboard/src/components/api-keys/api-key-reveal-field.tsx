"use client";

import {
  Copy01Icon,
  Tick02Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@notra/ui/components/ui/input";
import { cn } from "@notra/ui/lib/utils";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import type { ApiKeyRevealFieldProps } from "@/types/api-keys";

const COPIED_RESET_MS = 2000;

export function ApiKeyRevealField({
  value,
  className,
}: ApiKeyRevealFieldProps) {
  const t = useTranslations("apiKeys.reveal");
  const tCommon = useTranslations("common");
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyTimer.current) {
        clearTimeout(copyTimer.current);
      }
    },
    []
  );

  const handleCopy = async () => {
    if (!navigator.clipboard) {
      toast.error(tCommon("toasts.clipboardUnsupported"));
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      setCopied(false);
      toast.error(tCommon("toasts.copyFailed"));
      return;
    }

    setCopied(true);
    if (copyTimer.current) {
      clearTimeout(copyTimer.current);
    }
    copyTimer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
  };

  return (
    <div className={cn("relative", className)}>
      <Input
        className="h-10 pr-16 font-mono text-sm"
        readOnly
        type={revealed ? "text" : "password"}
        value={value}
      />
      <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
        <Button
          aria-label={revealed ? t("hide") : t("show")}
          className="text-muted-foreground size-7"
          onClick={() => setRevealed((current) => !current)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <HugeiconsIcon
            className="size-4"
            icon={revealed ? ViewOffSlashIcon : ViewIcon}
          />
        </Button>
        <Button
          aria-label={t("copy")}
          className={cn(
            "text-muted-foreground size-7",
            copied && "text-success"
          )}
          onClick={handleCopy}
          size="icon"
          type="button"
          variant="ghost"
        >
          <HugeiconsIcon
            className="size-4"
            icon={copied ? Tick02Icon : Copy01Icon}
          />
        </Button>
      </div>
    </div>
  );
}
