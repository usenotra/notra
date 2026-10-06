"use client";

import {
  ArrowUp02Icon,
  Cancel01Icon,
  Edit02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useUiLabels } from "@notra/ui/components/shared/ui-labels-provider";
import { Spinner } from "@notra/ui/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import {
  COMPOSER_CHIP_ACTION,
  COMPOSER_NUDGE_ENTER,
  COMPOSER_SEND_BUTTON,
  COMPOSER_TOOLBAR_BUTTON,
  COMPOSER_TRAY_TRANSITION,
} from "@notra/ui/constants/composer";
import { cn } from "@notra/ui/lib/utils";
import type {
  ComposerChipProps,
  ComposerFrameProps,
  ComposerNudgeProps,
  ComposerSendProps,
  ComposerToolbarButtonProps,
  ComposerToolbarProps,
} from "@notra/ui/types/composer";

// A muted tray around the input card. The nudge (queue, chips, notices) sits
// directly on the tray above the card. Flat composers only show the tray
// while there is a nudge.
function ComposerFrame({
  children,
  nudge,
  connectedTop = false,
  flat = false,
  className,
}: ComposerFrameProps) {
  const hasNudge = Boolean(nudge);
  const showTray = hasNudge || !flat;

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col",
        COMPOSER_TRAY_TRANSITION,
        showTray ? "bg-muted p-1" : "bg-transparent",
        flat ? "rounded-xl" : "rounded-[18px]",
        connectedTop && "rounded-t-none",
        className
      )}
    >
      {nudge}
      <div
        className={cn(
          "border-border/70 bg-background min-w-0 overflow-hidden border",
          flat
            ? "rounded-lg"
            : "rounded-[14px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none",
          connectedTop && !hasNudge && "rounded-t-none border-t-0"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function ComposerNudge({ title, action, children }: ComposerNudgeProps) {
  const hasChips = Boolean(children);

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 px-1.5 pt-0.5 pb-1",
        COMPOSER_NUDGE_ENTER,
        hasChips && "flex-wrap"
      )}
    >
      {title && !hasChips ? (
        <p className="min-w-0 flex-1 text-xs font-medium wrap-anywhere">
          {title}
        </p>
      ) : null}
      {hasChips ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {children}
        </div>
      ) : null}
      {action ? <div className="ml-auto shrink-0">{action}</div> : null}
    </div>
  );
}

function ComposerChip({
  icon,
  label,
  onRemove,
  removeLabel,
  onEdit,
  editLabel,
  onSteer,
  steerLabel,
  onClick,
  pending = false,
  className,
  labelClassName,
}: ComposerChipProps) {
  const labels = useUiLabels();
  const labelClasses = cn("max-w-[12rem] truncate", labelClassName);
  const content = (
    <>
      {icon}
      <span className={labelClasses} title={label}>
        {label}
      </span>
    </>
  );

  return (
    <span
      aria-busy={pending || undefined}
      className={cn(
        "border-foreground/25 bg-background text-foreground inline-flex max-w-full items-center gap-1.5 rounded-md border border-dashed py-1 pr-1 pl-1.5 text-xs",
        pending && "border-foreground/15 text-muted-foreground",
        className
      )}
    >
      {onClick ? (
        <button
          aria-label={labels.composerPreview(label)}
          className="hover:text-foreground flex min-w-0 items-center gap-1.5 rounded-sm text-left transition-colors"
          onClick={onClick}
          type="button"
        >
          {content}
        </button>
      ) : (
        content
      )}
      {onSteer && !pending ? (
        <button
          aria-label={steerLabel ?? labels.composerSteer(label)}
          className={COMPOSER_CHIP_ACTION}
          onClick={onSteer}
          type="button"
        >
          <HugeiconsIcon className="size-3" icon={ArrowUp02Icon} />
        </button>
      ) : null}
      {onEdit && !pending ? (
        <button
          aria-label={editLabel ?? labels.composerEdit(label)}
          className={COMPOSER_CHIP_ACTION}
          onClick={onEdit}
          type="button"
        >
          <HugeiconsIcon className="size-3" icon={Edit02Icon} />
        </button>
      ) : null}
      {onRemove ? (
        <button
          aria-label={removeLabel ?? labels.composerRemove(label)}
          className={COMPOSER_CHIP_ACTION}
          onClick={onRemove}
          type="button"
        >
          <HugeiconsIcon className="size-3" icon={Cancel01Icon} />
        </button>
      ) : null}
    </span>
  );
}

function ComposerToolbar({ children, className }: ComposerToolbarProps) {
  return (
    <div className={cn("flex items-center gap-1 px-2 pt-1 pb-2", className)}>
      {children}
    </div>
  );
}

function ComposerToolbarButton({
  className,
  type = "button",
  ...props
}: ComposerToolbarButtonProps) {
  return (
    <button
      className={cn(COMPOSER_TOOLBAR_BUTTON, className)}
      type={type}
      {...props}
    />
  );
}

function ComposerSend({
  children,
  label,
  tooltip,
  busy = false,
  disabled = false,
  onClick,
}: ComposerSendProps) {
  const isInert = disabled && !busy;
  const buttonProps = {
    "aria-busy": busy,
    "aria-disabled": disabled,
    "aria-label": label,
    className: cn(
      COMPOSER_SEND_BUTTON,
      isInert
        ? "bg-foreground/[0.08] text-muted-foreground/70"
        : "bg-foreground text-background hover:bg-foreground/85",
      disabled && "pointer-events-none"
    ),
    onClick: disabled ? undefined : onClick,
    type: "button" as const,
  };

  const content = busy ? <Spinner className="size-3.5" /> : children;

  if (!tooltip) {
    return <button {...buttonProps}>{content}</button>;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={<button {...buttonProps} />}>
        {content}
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export const Composer = {
  Frame: ComposerFrame,
  Nudge: ComposerNudge,
  Chip: ComposerChip,
  Toolbar: ComposerToolbar,
  ToolbarButton: ComposerToolbarButton,
  Send: ComposerSend,
};
