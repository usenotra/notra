"use client";

import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CopyButton } from "@notra/ui/components/ui/copy-button";
import { Input } from "@notra/ui/components/ui/input";
import { cn } from "@notra/ui/lib/utils";
import { useState } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import type { ApiKeyRevealFieldProps } from "@/types/api-keys";
import { toastCopyError } from "@/utils/copy-to-clipboard";

export function ApiKeyRevealField({
  value,
  className,
}: ApiKeyRevealFieldProps) {
  const t = useTranslations("apiKeys.reveal");
  const [revealed, setRevealed] = useState(false);

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
        <CopyButton
          aria-label={t("copy")}
          className="text-muted-foreground size-7"
          onCopyError={toastCopyError}
          size="icon"
          value={value}
        />
      </div>
    </div>
  );
}
