"use client";

import {
  ArrowUp02Icon,
  Cancel01Icon,
  Edit02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import type { ComponentProps } from "react";
import { useTranslations } from "use-intl";

import { StatusSpinner } from "@/components/geo/status-spinner";
import {
  COMPOSER_FRAME_TRANSITION,
  COMPOSER_INNER_FRAME,
  COMPOSER_NUDGE_ENTER,
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
  flat = false,
  className,
}: ComposerFrameProps) {
  const hasNudge = Boolean(nudge);

  return (
    <div
      className={cn(
        "w-full min-w-0 p-1",
        flat ? "rounded-xl" : "rounded-2xl",
        COMPOSER_FRAME_TRANSITION,
        hasNudge ? "bg-muted" : "bg-transparent",
        connectedTop ? "rounded-t-none" : null,
        className
      )}
    >
      {nudge}
      <div
        className={cn(
          COMPOSER_INNER_FRAME,
          hasNudge ? "rounded-xl" : "rounded-2xl",
          flat && (hasNudge ? "rounded-lg" : "rounded-xl"),
          flat && "shadow-none",
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
        "flex items-center gap-2 px-2 pb-1",
        COMPOSER_NUDGE_ENTER,
        hasChips ? "flex-wrap" : null
      )}
    >
      {title && !hasChips ? (
        <p className="min-w-0 flex-1 text-xs font-medium wrap-anywhere">
          {title}
        </p>
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
  onSteer,
  steerLabel,
  onClick,
  pending = false,
  className,
  labelClassName,
}: ComposerChipProps) {
  const t = useTranslations("composer");
  const tCommon = useTranslations("common");
  const labelClasses = cn("max-w-[12rem] truncate", labelClassName);

  return (
    <span
      aria-busy={pending || undefined}
      className={cn(
        "border-foreground/25 bg-background text-foreground inline-flex max-w-full items-center gap-1.5 rounded-md border border-dashed py-1 pr-1 pl-1.5 text-xs",
        pending ? "border-foreground/15 text-muted-foreground" : null,
        className
      )}
    >
      {onClick ? (
        <button
          aria-label={t("preview", { label })}
          className="hover:text-foreground flex min-w-0 items-center gap-1.5 rounded-sm text-left transition-colors"
          onClick={onClick}
          type="button"
        >
          {icon}
          <span className={labelClasses} title={label}>
            {label}
          </span>
        </button>
      ) : (
        <>
          {icon}
          <span className={labelClasses} title={label}>
            {label}
          </span>
        </>
      )}
      {onSteer && !pending ? (
        <button
          aria-label={steerLabel ?? t("steerWith", { label })}
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-4 shrink-0 items-center justify-center rounded transition-colors"
          onClick={onSteer}
          type="button"
        >
          <HugeiconsIcon className="size-3" icon={ArrowUp02Icon} />
        </button>
      ) : null}
      {onEdit && !pending ? (
        <button
          aria-label={editLabel ?? tCommon("labels.editLabel", { label })}
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-4 shrink-0 items-center justify-center rounded transition-colors"
          onClick={onEdit}
          type="button"
        >
          <HugeiconsIcon className="size-3" icon={Edit02Icon} />
        </button>
      ) : null}
      {onRemove ? (
        <button
          aria-label={removeLabel ?? tCommon("labels.removeLabel", { label })}
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
    <div className={cn("flex items-center gap-1 px-2 pb-2", className)}>
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
