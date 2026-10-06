"use client";

import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useUiLabels } from "@notra/ui/components/shared/ui-labels-provider";
import { Button } from "@notra/ui/components/ui/button";
import { useCopyToClipboard } from "@notra/ui/hooks/use-copy-to-clipboard";
import { cn } from "@notra/ui/lib/utils";
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
  const { copied, copy } = useCopyToClipboard({
    timeout,
    onError: onCopyError,
  });
  const hasLabel = children !== undefined && children !== null;
  const swapsLabel = hasLabel && copiedLabel !== undefined;

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
      <CopyStateIcon
        copied={copied}
        iconClassName={iconClassName}
        tinted={!FILLED_VARIANTS.has(variant)}
      />
      {swapsLabel ? (
        <span className="grid text-start">
          <span
            aria-hidden={copied}
            className={cn(SWAP_CLASS, copied && "opacity-0 blur-xs")}
          >
            {children}
          </span>
          <span
            aria-hidden={!copied}
            className={cn(SWAP_CLASS, !copied && "opacity-0 blur-xs")}
          >
            {copiedLabel}
          </span>
        </span>
      ) : (
        children
      )}
    </Button>
  );
}
