"use client";

import { cn } from "cn";
import {
  ChevronDownIcon,
  CornerDownLeftIcon,
  MicIcon,
  SquareIcon,
} from "lucide-react";
import type { FormEvent, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";

import { CLAUDE_DEFAULT_CONTEXT_USAGE } from "../constants/claude";
import {
  CLAUDE_DEFAULT_EFFORT,
  CLAUDE_DEFAULT_MODEL,
} from "../constants/claude-models";
import type { ClaudeComposerProps } from "../types/claude";
import { ClaudeModelSelector } from "./claude-model-selector";
import { ClaudePlusMenu } from "./claude-plus-menu";
import { ClaudeUsageRing } from "./claude-usage-ring";

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

const GHOST_CLASS =
  "hover:bg-claude-hover focus-visible:ring-claude-fg/20 aria-expanded:bg-claude-hover dark:hover:bg-claude-hover focus-visible:border-transparent focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0";

const ClaudeComposerGlyph = ({
  children,
  show,
}: {
  children: ReactNode;
  show: boolean;
}) => (
  <span
    aria-hidden="true"
    className={cn(
      "absolute inset-0 flex items-center justify-center transition-[opacity,scale] duration-200 motion-reduce:transition-opacity",
      EASE,
      show
        ? "scale-100 opacity-100"
        : "pointer-events-none scale-[0.92] opacity-0"
    )}
  >
    {children}
  </span>
);

const ClaudeComposerSubmit = ({
  busy,
  canSend,
  onStop,
}: {
  busy: boolean;
  canSend: boolean;
  onStop?: () => void;
}) => {
  const handleClick = busy
    ? (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        onStop?.();
      }
    : undefined;

  return (
    <InputGroupButton
      aria-label={busy ? "Stop" : "Send"}
      className={cn(
        GHOST_CLASS,
        "text-claude-faint hover:text-claude-fg relative size-8 rounded-lg transition-colors duration-150 motion-reduce:transition-none",
        (busy || canSend) && "text-claude-fg"
      )}
      onClick={handleClick}
      size="icon-sm"
      type={canSend && !busy ? "submit" : "button"}
      variant="ghost"
    >
      <ClaudeComposerGlyph show={!busy}>
        <CornerDownLeftIcon className="size-4.5" strokeWidth={1.25} />
      </ClaudeComposerGlyph>
      <ClaudeComposerGlyph show={busy}>
        <SquareIcon className="size-3 fill-current" strokeWidth={1.5} />
      </ClaudeComposerGlyph>
    </InputGroupButton>
  );
};

export const ClaudeComposer = ({
  busy = false,
  className,
  defaultEffort = CLAUDE_DEFAULT_EFFORT,
  defaultModel = CLAUDE_DEFAULT_MODEL,
  contextUsage = CLAUDE_DEFAULT_CONTEXT_USAGE,
  disclaimer,
  effort: effortProp,
  model: modelProp,
  onEffortChange,
  mode = "Manual",
  onModeClick,
  onModelChange,
  onPlusSelect,
  onSend,
  onStop,
  placeholder = "Reply",
  ...props
}: ClaudeComposerProps) => {
  const [value, setValue] = useState("");
  const [uncontrolledModel, setUncontrolledModel] = useState(defaultModel);
  const [uncontrolledEffort, setUncontrolledEffort] = useState(defaultEffort);
  const model = modelProp ?? uncontrolledModel;
  const effort = effortProp ?? uncontrolledEffort;
  const canSend = value.trim().length > 0;

  const submit = () => {
    const text = value.trim();
    if (!text || busy) {
      return;
    }
    onSend?.(text);
    if (onSend) {
      setValue("");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div
      className={cn("font-claude @container/claude-composer w-full", className)}
      data-slot="claude-composer"
      {...props}
    >
      <form onSubmit={handleSubmit}>
        <InputGroup className="border-claude-input-border bg-claude-input dark:bg-claude-input has-[[data-slot=input-group-control]:focus-visible]:border-claude-input-border h-auto items-end rounded-2xl ps-4 pe-2 shadow-[0_1px_2px_var(--claude-input-shadow)] has-[[data-slot=input-group-control]:focus-visible]:ring-0">
          <InputGroupTextarea
            aria-label="Message"
            className="text-claude-fg placeholder:text-claude-muted max-h-60 min-h-12 overflow-y-auto px-0 py-3 text-[0.9375rem] leading-6 md:text-[0.9375rem]"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            value={value}
          />
          <InputGroupAddon
            align="inline-end"
            className="cursor-default py-2 pe-0"
          >
            <ClaudeComposerSubmit
              busy={busy}
              canSend={canSend}
              onStop={onStop}
            />
          </InputGroupAddon>
        </InputGroup>
      </form>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-2">
        <div className="flex items-center gap-0.5">
          <ClaudePlusMenu onSelect={onPlusSelect} />
          <Button
            aria-label="Dictate"
            className={cn(
              GHOST_CLASS,
              "text-claude-text hover:text-claude-fg h-8 gap-1 rounded-lg px-2"
            )}
            type="button"
            variant="ghost"
          >
            <MicIcon className="size-4" strokeWidth={1.25} />
            <ChevronDownIcon
              className="text-claude-muted size-3"
              strokeWidth={1.5}
            />
          </Button>
        </div>
        {disclaimer && (
          <p className="text-claude-muted order-last basis-full text-center text-xs leading-5 @xl/claude-composer:order-none @xl/claude-composer:basis-auto">
            {disclaimer}
          </p>
        )}
        <div className="flex items-center gap-1">
          <ClaudeModelSelector
            effort={effort}
            model={model}
            onEffortChange={(next) => {
              if (effortProp === undefined) {
                setUncontrolledEffort(next);
              }
              onEffortChange?.(next);
            }}
            onModelChange={(next) => {
              if (modelProp === undefined) {
                setUncontrolledModel(next);
              }
              onModelChange?.(next);
            }}
          />
          {mode && (
            <Button
              className={cn(
                GHOST_CLASS,
                "text-claude-text hover:text-claude-fg h-7 rounded-lg px-1.5 text-xs font-normal"
              )}
              onClick={onModeClick}
              type="button"
              variant="ghost"
            >
              {mode}
            </Button>
          )}
          <ClaudeUsageRing className="ms-1.5 me-1" value={contextUsage} />
        </div>
      </div>
    </div>
  );
};
