"use client";

import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useUiLabels } from "@notra/ui/components/shared/ui-labels-provider";
import { Button } from "@notra/ui/components/ui/button";
import { useCopyToClipboard } from "@notra/ui/hooks/use-copy-to-clipboard";
import { cn } from "@notra/ui/lib/utils";
import { useState } from "react";
import type {
  CopyButtonClickHandler,
  CopyButtonProps,
  CopyStateIconProps,
} from "@notra/ui/types/copy-button";

// Both states share one grid cell and cross-fade in place, so the swap never
// reflows. The incoming state grows from a blurred quarter-size.
const SWAP_CLASS =
  "col-start-1 row-start-1 transition-[opacity,scale,filter] duration-normal ease-out motion-reduce:transition-none";
const SWAP_HIDDEN_CLASS = "scale-25 opacity-0 blur-xs";
// Green on a filled background loses contrast; there the tick keeps the label
// colour.
const FILLED_VARIANTS = new Set<CopyButtonProps["variant"]>([
  "default",
  "destructive",
]);

/* True from the first `copied` change until the swap back has finished, so
   buttons don't animate on mount and stop clipping once they're idle again.
   Same lifecycle as Button's loading swap. */
function useCopiedSwap(copied: boolean) {
  const [previousCopied, setPreviousCopied] = useState(copied);
  const [isSwapping, setIsSwapping] = useState(false);
  if (copied !== previousCopied) {
    setPreviousCopied(copied);
    setIsSwapping(true);
  }
  return { finishSwap: () => setIsSwapping(false), isSwapping };
}

/**
 * Copy icon that turns into a tick while `copied`. Use it inside your own
 * trigger when `CopyButton` doesn't fit, e.g. a tooltip trigger that also
 * swaps its tooltip text.
 */
export function CopyStateIcon({
  copied,
  className,
  iconClassName,
  tinted = true,
}: CopyStateIconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("grid place-items-center", className)}
      data-icon="inline-start"
      data-slot="copy-state-icon"
    >
      <HugeiconsIcon
        className={cn(SWAP_CLASS, iconClassName, copied && SWAP_HIDDEN_CLASS)}
        icon={Copy01Icon}
      />
      <HugeiconsIcon
        className={cn(
          SWAP_CLASS,
          tinted && "text-success",
          iconClassName,
          !copied && SWAP_HIDDEN_CLASS
        )}
        icon={Tick02Icon}
      />
    </span>
  );
}

/**
 * Copies `value` and confirms in place: the icon turns into a tick for a
 * moment. Icon-only unless you pass a label as children. Failures go to
 * `onCopyError`, so the caller decides how to surface them.
 */
export function CopyButton({
  value,
  onCopy,
  onCopyError,
  timeout,
  copiedLabel,
  copiedAriaLabel,
  iconClassName,
  children,
  onClick,
  variant = "ghost",
  size,
  "aria-label": ariaLabel,
  ...props
}: CopyButtonProps) {
  const labels = useUiLabels();
  const { copiedText, copy } = useCopyToClipboard({
    timeout,
    onError: onCopyError,
  });
  // Only the value that actually landed on the clipboard reads as copied.
  const copied = copiedText === value;
  const hasLabel = children !== undefined && children !== null;
  const swapsLabel = hasLabel && copiedLabel !== undefined;
  const { finishSwap, isSwapping } = useCopiedSwap(copied);
  const tickClassName = cn(
    !FILLED_VARIANTS.has(variant) && "text-success",
    iconClassName
  );

  const idleAriaLabel = ariaLabel ?? (hasLabel ? undefined : labels.copy);
  const activeAriaLabel = hasLabel
    ? ariaLabel
    : (copiedAriaLabel ?? labels.copied);

  const handleClick: CopyButtonClickHandler = async (event) => {
    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }
    if (await copy(value)) {
      onCopy?.();
    }
  };

  return (
    <Button
      aria-label={copied ? activeAriaLabel : idleAriaLabel}
      data-copied={copied ? "" : undefined}
      onClick={handleClick}
      size={size ?? (hasLabel ? "sm" : "icon-sm")}
      type="button"
      variant={variant}
      {...props}
    >
      {swapsLabel ? (
        <>
          {/* Like Button's loading state: the idle label sets the width and
              blurs up and out, the copied label rises in centred over it. */}
          <span
            aria-hidden={copied}
            className={cn(
              "relative inline-flex min-w-0 flex-1 items-center [gap:inherit] [justify-content:inherit] motion-reduce:animate-none",
              copied && "opacity-0",
              isSwapping &&
                (copied
                  ? "animate-button-swap-out"
                  : "animate-button-swap-in [animation-delay:70ms]")
            )}
            data-clip={isSwapping || copied ? "" : undefined}
            data-slot="button-label"
          >
            <HugeiconsIcon
              aria-hidden="true"
              className={iconClassName}
              data-icon="inline-start"
              icon={Copy01Icon}
            />
            {children}
          </span>
          {copied || isSwapping ? (
            <span
              aria-hidden={!copied}
              className={cn(
                "pointer-events-none absolute inset-0 flex items-center justify-center [gap:inherit] motion-reduce:animate-none",
                copied
                  ? isSwapping && "animate-button-swap-in [animation-delay:70ms]"
                  : "animate-button-swap-out opacity-0"
              )}
              data-slot="copy-button-copied"
              onAnimationEnd={(event) => {
                if (event.target === event.currentTarget) {
                  finishSwap();
                }
              }}
            >
              <HugeiconsIcon
                aria-hidden="true"
                className={tickClassName}
                icon={Tick02Icon}
              />
              {copiedLabel}
            </span>
          ) : null}
        </>
      ) : (
        <>
          <CopyStateIcon
            copied={copied}
            iconClassName={iconClassName}
            tinted={!FILLED_VARIANTS.has(variant)}
          />
          {children}
        </>
      )}
    </Button>
  );
}
