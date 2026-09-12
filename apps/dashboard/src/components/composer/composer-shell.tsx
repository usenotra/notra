"use client";

import { Cancel01Icon, Edit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import type { ComponentProps } from "react";

import { StatusSpinner } from "@/components/geo/status-spinner";
import {
  COMPOSER_FRAME_NUDGE_PADDING,
  COMPOSER_FRAME_TRANSITION,
  COMPOSER_INNER_FRAME,
  COMPOSER_NUDGE_ENTER,
  COMPOSER_NUDGE_GRID_TRANSITION,
  COMPOSER_SEND_BUTTON,
  COMPOSER_TOOLBAR_BUTTON,
} from "@/constants/composer";
import { cn } from "@/lib/utils";
import type {
  ComposerChipProps,
  ComposerFrameProps,
  ComposerNudgeProps,
  ComposerSendProps,
  ComposerToolbarProps,
} from "@/types/components/composer";

function ComposerFrame({
  children,
  nudge,
  connectedTop = false,
  className,
}: ComposerFrameProps) {
  const hasNudge = Boolean(nudge);

  return (
    <div
      className={cn(
        "w-full min-w-0 rounded-2xl",
        COMPOSER_FRAME_TRANSITION,
        hasNudge ? COMPOSER_FRAME_NUDGE_PADDING : "bg-transparent p-0",
        connectedTop ? "rounded-t-none" : null,
        className
      )}
    >
      <div
        className={cn(
          "grid",
          COMPOSER_NUDGE_GRID_TRANSITION,
          hasNudge ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">{nudge}</div>
      </div>
      <div
        className={cn(
          COMPOSER_INNER_FRAME,
          hasNudge ? "rounded-t-xl rounded-b-2xl" : "rounded-2xl",
          connectedTop && !hasNudge ? "rounded-t-none border-t-0" : null
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
        "flex items-center gap-2 px-2.5 pt-1 pb-1.5",
        COMPOSER_NUDGE_ENTER,
        hasChips ? "flex-wrap" : null
      )}
    >
      {title && !hasChips ? (
        <p className="min-w-0 flex-1 text-sm font-medium">{title}</p>
      ) : null}
      {hasChips ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 [&_.text-warning]:mt-0.5 [&_.text-warning]:self-start [&_.text-warning+span]:min-w-0 [&_.text-warning+span]:flex-1 [&_.text-warning+span]:overflow-visible [&_.text-warning+span]:leading-5 [&_.text-warning+span]:text-clip [&_.text-warning+span]:whitespace-normal">
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
  onClick,
  pending = false,
  className,
  labelClassName,
}: ComposerChipProps) {
  const labelClasses = cn("max-w-[12rem] truncate", labelClassName);

  return (
    <span
      className={cn(
        "border-foreground/25 bg-background text-foreground inline-flex max-w-full items-center gap-1.5 rounded-md border border-dashed py-1 pr-1 pl-1.5 text-xs",
        pending ? "border-foreground/15 text-muted-foreground" : null,
        className
      )}
    >
      {onClick ? (
        <button
          aria-label={`Preview ${label}`}
          className="hover:text-foreground flex min-w-0 items-center gap-1.5 rounded-sm text-left transition-colors"
          onClick={onClick}
          type="button"
        >
          {icon}
          <span className={labelClasses}>{label}</span>
        </button>
      ) : (
        <>
          {icon}
          <span className={labelClasses}>{label}</span>
        </>
      )}
      {onEdit ? (
        <button
          aria-label={editLabel ?? `Edit ${label}`}
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-4 shrink-0 items-center justify-center rounded transition-colors"
          onClick={onEdit}
          type="button"
        >
          <HugeiconsIcon className="size-3" icon={Edit02Icon} />
        </button>
      ) : null}
      {onRemove ? (
        <button
          aria-label={removeLabel ?? `Remove ${label}`}
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-4 shrink-0 items-center justify-center rounded transition-colors"
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
    <div className={cn("flex items-center gap-1 px-2.5 pb-2.5", className)}>
      {children}
    </div>
  );
}

function ComposerToolbarButton({
  className,
  type = "button",
  ...props
}: ComponentProps<"button">) {
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
  busy = false,
  disabled = false,
  tooltip,
  label,
  onClick,
}: ComposerSendProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-busy={busy}
            aria-disabled={disabled}
            aria-label={label}
            className={cn(
              COMPOSER_SEND_BUTTON,
              disabled ? "pointer-events-none" : null,
              disabled && !busy ? "opacity-30" : null
            )}
            onClick={disabled ? undefined : onClick}
            type="button"
          />
        }
      >
        {busy ? <StatusSpinner /> : children}
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
