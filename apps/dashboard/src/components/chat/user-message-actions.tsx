"use client";

import {
  ArrowLeft01Icon,
  ArrowReloadHorizontalIcon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Edit02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { TRANSITION } from "@notra/ui/lib/motion";
import { cn } from "@notra/ui/lib/utils";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/button";
import { ModelIcon } from "@/components/chat/chat-input";
import { AVAILABLE_MODELS } from "@/constants/chat-models";
import type { ChatModelOption } from "@/types/components/chat-input";
import type {
  UserMessageEditorProps,
  UserMessageTextBubbleProps,
} from "@/types/components/chat-page";

interface UserMessageActionsProps {
  availableModels?: readonly ChatModelOption[];
  messageText: string;
  canInteract: boolean;
  onEdit: () => void;
  onRetry: (model?: string) => void;
  branchIndex?: number;
  branchTotal?: number;
  onPreviousBranch?: () => void;
  onNextBranch?: () => void;
  isEditing?: boolean;
  className?: string;
}

export function UserMessageActions({
  availableModels = AVAILABLE_MODELS,
  messageText,
  canInteract,
  onEdit,
  onRetry,
  branchIndex,
  branchTotal,
  onPreviousBranch,
  onNextBranch,
  isEditing,
  className,
}: UserMessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [retryOpen, setRetryOpen] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // no-op
    }
  }, [messageText]);

  const hasBranches =
    typeof branchIndex === "number" &&
    typeof branchTotal === "number" &&
    branchTotal > 1;

  return (
    <div
      className={cn(
        "text-muted-foreground duration-normal mt-0.5 ml-auto flex items-center gap-1 transition-[opacity,height,margin,padding] ease-out",
        isEditing
          ? "pointer-events-none mt-0 h-0 overflow-hidden opacity-0"
          : "opacity-0 group-hover:opacity-100 focus-within:opacity-100 data-[force-visible=true]:opacity-100",
        className
      )}
      data-force-visible={retryOpen || undefined}
    >
      {hasBranches && (
        <div className="flex items-center text-xs tabular-nums">
          <Button
            aria-label="Previous version"
            className="size-5"
            disabled={!canInteract}
            onClick={onPreviousBranch}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={12} />
          </Button>
          <span className="px-0.5 text-[11px]">
            {(branchIndex ?? 0) + 1}/{branchTotal}
          </span>
          <Button
            aria-label="Next version"
            className="size-5"
            disabled={!canInteract}
            onClick={onNextBranch}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
          </Button>
        </div>
      )}

      <div className="flex items-center gap-1">
        <DropdownMenu onOpenChange={setRetryOpen} open={retryOpen}>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  disabled={!canInteract}
                  render={
                    <Button
                      aria-label="Retry"
                      className="size-5"
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    />
                  }
                />
              }
            >
              <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={12} />
            </TooltipTrigger>
            <TooltipContent>Retry</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem onClick={() => onRetry()}>
              <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={12} />
              <span className="text-sm">Retry with same</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Model</DropdownMenuLabel>
            </DropdownMenuGroup>
            {availableModels.map((m) => (
              <DropdownMenuItem key={m.id} onClick={() => onRetry(m.id)}>
                <ModelIcon className="size-4 shrink-0" provider={m.provider} />
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm">{m.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {m.description}
                  </span>
                  <span className="text-muted-foreground/70 text-[0.625rem]">
                    {m.pricing}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label="Edit message"
                className="size-5"
                disabled={!canInteract}
                onClick={onEdit}
                size="icon-sm"
                type="button"
                variant="ghost"
              />
            }
          >
            <HugeiconsIcon icon={Edit02Icon} size={12} />
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label="Copy message"
                className={cn(
                  "size-5",
                  copied && "text-success hover:text-success"
                )}
                onClick={handleCopy}
                size="icon-sm"
                type="button"
                variant="ghost"
              />
            }
          >
            <HugeiconsIcon
              icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
              size={12}
            />
          </TooltipTrigger>
          <TooltipContent>{copied ? "Copied" : "Copy"}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

const USER_MESSAGE_BUBBLE_CLASS =
  "ml-auto flex min-w-0 flex-col gap-2 overflow-hidden rounded-lg bg-secondary px-4 py-3 text-foreground text-sm";

const USER_MESSAGE_EDIT_TRANSITION = TRANSITION.enter;
const USER_MESSAGE_FADE_TRANSITION = TRANSITION.fade;

function UserMessageEditor({
  initialText,
  onCancel,
  onSubmit,
}: UserMessageEditorProps) {
  const [value, setValue] = useState(initialText);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const reduceMotion = useReducedMotion();

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure when value changes (scrollHeight is read from the DOM).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const trimmedValue = value.trim();
  const isUnchanged = trimmedValue === initialText.trim();

  const handleSubmit = () => {
    if (!trimmedValue) {
      return;
    }
    if (isUnchanged) {
      onCancel();
      return;
    }
    onSubmit(trimmedValue);
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea
        className="text-foreground placeholder:text-muted-foreground max-h-80 min-h-6 w-full resize-none bg-transparent text-sm leading-6 wrap-break-word outline-none"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        placeholder="Edit your message..."
        ref={textareaRef}
        rows={1}
        value={value}
      />
      <m.div
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-end gap-2"
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        transition={USER_MESSAGE_FADE_TRANSITION}
      >
        <Button onClick={onCancel} size="sm" type="button" variant="ghost">
          Cancel
        </Button>
        <Button
          disabled={trimmedValue.length === 0 || isUnchanged}
          onClick={handleSubmit}
          size="sm"
          type="button"
        >
          Send
        </Button>
      </m.div>
    </div>
  );
}

export function UserMessageTextBubble({
  children,
  isEditing,
  initialText,
  onCancel,
  onSubmit,
}: UserMessageTextBubbleProps) {
  const reduceMotion = useReducedMotion();

  return (
    <m.div
      className={cn(
        USER_MESSAGE_BUBBLE_CLASS,
        isEditing ? "w-full" : "is-user:dark w-fit max-w-full"
      )}
      layout={!reduceMotion}
      transition={USER_MESSAGE_EDIT_TRANSITION}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {isEditing ? (
          <m.div
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            initial={reduceMotion ? false : { opacity: 0 }}
            key="edit"
            transition={USER_MESSAGE_FADE_TRANSITION}
          >
            <UserMessageEditor
              initialText={initialText}
              onCancel={onCancel}
              onSubmit={onSubmit}
            />
          </m.div>
        ) : (
          <m.div
            animate={{ opacity: 1 }}
            className="flex min-w-0 flex-col gap-2 overflow-hidden"
            exit={reduceMotion ? undefined : { opacity: 0 }}
            initial={reduceMotion ? false : { opacity: 0 }}
            key="view"
            transition={USER_MESSAGE_FADE_TRANSITION}
          >
            {children}
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}
