"use client";

import { Copy01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { COPY_FEEDBACK_MS } from "@notra/geo-core/constants/geo";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { highlight } from "sugar-high";

import { Button } from "@/components/button";
import { cn } from "@/lib/utils";
import type { CodeSnippetProps, CopyCodeButtonProps } from "@/types/geo";

export function useCopyCode(code: string) {
  const tCommon = useTranslations("common");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copied = copiedCode === code;

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
      await navigator.clipboard.writeText(code);
    } catch {
      toast.error(tCommon("toasts.copyFailed"));
      return;
    }

    setCopiedCode(code);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => setCopiedCode(null), COPY_FEEDBACK_MS);
  };

  return { copied, copy };
}

function CopyCodeButton({ code, label, onCopy }: CopyCodeButtonProps) {
  const tCommon = useTranslations("common");
  const { copied, copy } = useCopyCode(code);

  return (
    <Button
      aria-label={
        copied
          ? tCommon("labels.labelCopied", { label })
          : tCommon("labels.copyLabel", { label })
      }
      className="text-muted-foreground shrink-0"
      onClick={() => {
        onCopy?.();
        return copy();
      }}
      size="icon-xs"
      type="button"
      variant="ghost"
    >
      <HugeiconsIcon icon={copied ? Tick01Icon : Copy01Icon} size={14} />
    </Button>
  );
}

function CommandSnippet({
  code,
  className,
  label: labelProp,
  onCopy,
}: Pick<CodeSnippetProps, "code" | "className" | "label" | "onCopy">) {
  const t = useTranslations("geo.codeSnippet");
  const label = labelProp ?? t("command");
  return (
    <div
      className={cn(
        "border-border/60 bg-muted/40 flex h-9 min-w-0 items-center rounded-lg border ps-3 pe-1",
        className
      )}
    >
      <input
        aria-label={label}
        className="text-foreground h-full min-w-0 flex-1 cursor-text appearance-none border-0 bg-transparent p-0 font-mono text-xs leading-none shadow-none outline-none"
        onFocus={(event) => event.currentTarget.select()}
        readOnly
        value={code}
      />
      <CopyCodeButton code={code} label={label} onCopy={onCopy} />
    </div>
  );
}

export function CodeSnippet({
  code,
  className,
  filename,
  headerEnd,
  variant = "panel",
  label,
  onCopy,
}: CodeSnippetProps) {
  const t = useTranslations("geo.codeSnippet");
  if (variant === "command") {
    return (
      <CommandSnippet
        className={className}
        code={code}
        label={label}
        onCopy={onCopy}
      />
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      <div className="border-border/60 bg-muted/40 overflow-hidden rounded-t-lg border border-b-0 pb-3">
        <div className="flex h-9 min-w-0 items-center gap-2 ps-3 pe-1">
          {filename ? (
            <p className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs">
              {filename}
            </p>
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          {headerEnd}
        </div>
      </div>
      <div className="border-border/60 bg-background relative -mt-3 min-w-0 rounded-lg border">
        <div className="absolute end-1 top-1 z-10">
          <CopyCodeButton code={code} label={t("snippet")} onCopy={onCopy} />
        </div>
        <pre
          className="scrollbar-floating m-0 overflow-x-auto p-3 pe-10 font-mono text-xs leading-relaxed"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sugar-high escapes the source before tokenizing
          dangerouslySetInnerHTML={{ __html: highlight(code) }}
        />
      </div>
    </div>
  );
}
