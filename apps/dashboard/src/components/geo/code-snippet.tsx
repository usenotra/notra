"use client";

import { AiMagicIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CopyButton } from "@notra/ui/components/ui/copy-button";
import { Tabs, TabsList, TabsTrigger } from "@notra/ui/components/ui/tabs";
import { useCopyToClipboard } from "@notra/ui/hooks/use-copy-to-clipboard";
import { highlight } from "sugar-high";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { cn } from "@/lib/utils";
import type {
  CodeSnippetProps,
  CodeSnippetTabsProps,
  CopyCodeButtonProps,
  CopyPromptButtonProps,
} from "@/types/geo";
import { toastCopyError } from "@/utils/copy-to-clipboard";

function CopyCodeButton({ code, label, onCopy }: CopyCodeButtonProps) {
  const tCommon = useTranslations("common");

  return (
    <CopyButton
      aria-label={tCommon("labels.copyLabel", { label })}
      className="text-muted-foreground"
      copiedAriaLabel={tCommon("labels.labelCopied", { label })}
      onCopy={onCopy}
      onCopyError={toastCopyError}
      size="icon-xs"
      value={code}
    />
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

/** Underlined variant tabs that sit in a `CodeSnippet` header. */
export function CodeSnippetTabs({
  label,
  value,
  options,
  onValueChange,
}: CodeSnippetTabsProps) {
  return (
    <Tabs className="gap-0" onValueChange={onValueChange} value={value}>
      <TabsList aria-label={label} className="h-9 gap-3" variant="line">
        {options.map((option) => (
          <TabsTrigger
            // The underline (the trigger's last child) sits on the header's
            // bottom edge instead of below it, where the code body covers it.
            className="flex-none gap-1.5 px-0 text-xs [&>span:last-child]:bottom-0"
            key={option.value}
            value={option.value}
          >
            {option.icon}
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/**
 * "Copy agent prompt" with the confirmation in place: icon and label cross-fade
 * to the copied state inside a fixed-width label cell, so nothing reflows.
 */
export function CopyPromptButton({
  prompt,
  disabled,
  onCopy,
  className,
}: CopyPromptButtonProps) {
  const tCommon = useTranslations("common");
  const { copiedText, copy } = useCopyToClipboard({
    onError: toastCopyError,
  });
  const copied = copiedText === prompt;
  const fade =
    "col-start-1 row-start-1 transition-[opacity,filter,translate,scale] duration-normal ease-emphasized motion-reduce:transition-none";
  const hidden = "opacity-0 blur-[2px]";

  return (
    <Button
      className={cn("gap-2", className)}
      disabled={disabled}
      onClick={async () => {
        if (await copy(prompt)) {
          onCopy?.();
        }
      }}
      size="sm"
      type="button"
      variant="outline"
    >
      <span aria-hidden="true" className="grid size-3.5 place-items-center">
        <HugeiconsIcon
          className={cn(fade, copied && `${hidden} scale-50`)}
          icon={AiMagicIcon}
          size={14}
        />
        <HugeiconsIcon
          className={cn(fade, "text-success", !copied && `${hidden} scale-50`)}
          icon={Tick02Icon}
          size={14}
        />
      </span>
      <span className="grid">
        <span
          aria-hidden={copied}
          className={cn(fade, copied && `${hidden} -translate-y-1`)}
        >
          {tCommon("labels.copyAgentPrompt")}
        </span>
        <span
          aria-hidden={!copied}
          className={cn(fade, !copied && `${hidden} translate-y-1`)}
        >
          {tCommon("labels.promptCopied")}
        </span>
      </span>
    </Button>
  );
}

export function CodeSnippet({
  code,
  className,
  filename,
  headerEnd,
  tabs,
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
        <div className="flex h-9 min-w-0 items-center gap-3 ps-3 pe-1">
          {tabs ? (
            <div className="min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto">
              {tabs}
            </div>
          ) : null}
          {filename ? (
            <p
              className={cn(
                "text-muted-foreground truncate font-mono text-xs",
                tabs ? "shrink-0 pe-2" : "min-w-0 flex-1"
              )}
            >
              {filename}
            </p>
          ) : null}
          {tabs || filename ? null : <span className="min-w-0 flex-1" />}
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
