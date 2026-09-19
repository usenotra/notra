"use client";

import {
  ArrowDown01Icon,
  ArrowUp02Icon,
  Mic01Icon,
  PlusSignIcon,
  Search01Icon,
  StopIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PerplexityModelSelector } from "@notra/ui/components/brainless/perplexity/perplexity-model-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { cn } from "@notra/ui/lib/utils";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { useState } from "react";
import {
  PERPLEXITY_DEFAULT_FOCUS,
  PERPLEXITY_DEFAULT_MODEL,
  PERPLEXITY_FOCUS_OPTIONS,
} from "../../../constants/perplexity-models";
import { getPerplexityFocus } from "../../../lib/perplexity-model";
import type {
  PerplexityFocusId,
  PerplexityModelId,
} from "../../../types/perplexity";

const CHIP_CLASS =
  "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 font-sans text-[13px] leading-none outline-none transition-[background-color,color,transform] duration-fast active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-black/15";

function IconButton({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-[#3d3d3d] outline-none transition-[background-color,transform] duration-fast hover:bg-[#f3f3f3] focus-visible:ring-2 focus-visible:ring-black/15 active:scale-[0.96] dark:text-foreground dark:hover:bg-white/10",
        className
      )}
      type="button"
    >
      {children}
    </button>
  );
}

function ComposerSubmit({
  busy,
  canSend,
  onStop,
}: {
  busy: boolean;
  canSend: boolean;
  onStop?: () => void;
}) {
  const enabled = busy || canSend;

  return (
    <button
      aria-label={busy ? "Stop" : "Send"}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full outline-none transition-[background-color,color,opacity,transform] duration-fast focus-visible:ring-2 focus-visible:ring-black/15 active:scale-[0.96]",
        enabled
          ? "bg-[#2a2a2a] text-white hover:bg-[#1a1a1a] dark:bg-white dark:text-[#1a1a1a] dark:hover:bg-white/90"
          : "bg-[#d9d9d9] text-white dark:bg-white/20 dark:text-white/70"
      )}
      disabled={!enabled}
      onClick={
        busy
          ? (event) => {
              event.preventDefault();
              onStop?.();
            }
          : undefined
      }
      type={canSend && !busy ? "submit" : "button"}
    >
      <HugeiconsIcon
        icon={busy ? StopIcon : ArrowUp02Icon}
        size={busy ? 12 : 16}
        strokeWidth={2}
      />
    </button>
  );
}

export function PerplexityComposer({
  onSend,
  onStop,
  placeholder = "Ask a follow-up",
  model: modelProp,
  defaultModel = PERPLEXITY_DEFAULT_MODEL,
  onModelChange,
  focus: focusProp,
  defaultFocus = PERPLEXITY_DEFAULT_FOCUS,
  onFocusChange,
  busy = false,
  className,
}: {
  onSend?: (text: string) => void;
  onStop?: () => void;
  placeholder?: string;
  model?: PerplexityModelId;
  defaultModel?: PerplexityModelId;
  onModelChange?: (model: PerplexityModelId) => void;
  focus?: PerplexityFocusId;
  defaultFocus?: PerplexityFocusId;
  onFocusChange?: (focus: PerplexityFocusId) => void;
  busy?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [uncontrolledModel, setUncontrolledModel] = useState(defaultModel);
  const [uncontrolledFocus, setUncontrolledFocus] = useState(defaultFocus);
  const [focusOpen, setFocusOpen] = useState(false);
  const model = modelProp ?? uncontrolledModel;
  const focus = focusProp ?? uncontrolledFocus;
  const selectedFocus = getPerplexityFocus(focus);
  const canSend = value.trim().length > 0;

  function submit() {
    const text = value.trim();
    if (!text || busy) {
      return;
    }
    onSend?.(text);
    if (onSend) {
      setValue("");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  function setFocus(next: PerplexityFocusId) {
    if (focusProp === undefined) {
      setUncontrolledFocus(next);
    }
    onFocusChange?.(next);
  }

  return (
    <form
      className={cn(
        "flex flex-col rounded-[1.65rem] border border-black/[0.08] bg-white px-3 pt-3 pb-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] dark:border-white/10 dark:bg-[#1c1c1c] dark:shadow-none",
        className
      )}
      onSubmit={handleSubmit}
    >
      <textarea
        aria-label="Follow-up"
        className="field-sizing-content max-h-80 min-h-[2.75rem] w-full resize-none overflow-y-auto bg-transparent px-1.5 pt-0.5 pb-2 font-sans text-[15px] leading-6 text-[#1a1a1a] outline-none placeholder:text-[#8d8d8d] dark:text-foreground"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        value={value}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-0.5">
          <IconButton label="Add">
            <HugeiconsIcon icon={PlusSignIcon} size={16} strokeWidth={1.75} />
          </IconButton>
          <DropdownMenu onOpenChange={setFocusOpen} open={focusOpen}>
            <DropdownMenuTrigger
              render={
                <button
                  aria-label={`Focus ${selectedFocus.label}`}
                  className={cn(
                    CHIP_CLASS,
                    "text-[#3d3d3d] hover:bg-[#f3f3f3] dark:text-foreground dark:hover:bg-white/10",
                    focusOpen && "bg-[#f3f3f3] dark:bg-white/10"
                  )}
                  type="button"
                />
              }
            >
              <HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={1.75} />
              <span>{selectedFocus.label}</span>
              <HugeiconsIcon
                className={cn(
                  "text-[#8d8d8d] transition-transform duration-fast",
                  focusOpen && "rotate-180"
                )}
                icon={ArrowDown01Icon}
                size={11}
                strokeWidth={2}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="min-w-52 rounded-[1.2rem] p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.12)]"
              side="top"
              sideOffset={8}
            >
              {PERPLEXITY_FOCUS_OPTIONS.map((option) => (
                <DropdownMenuItem
                  className="cursor-pointer flex-col items-start gap-0.5 rounded-[0.95rem] px-2.5 py-2 data-highlighted:bg-[#f3f3f3] dark:data-highlighted:bg-white/10"
                  key={option.id}
                  onClick={() => setFocus(option.id)}
                >
                  <span className="font-medium text-[13px]">{option.label}</span>
                  <span className="text-[12px] text-[#6b6b6b] dark:text-muted-foreground">
                    {option.description}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <PerplexityModelSelector
            model={model}
            onModelChange={(next) => {
              if (modelProp === undefined) {
                setUncontrolledModel(next);
              }
              onModelChange?.(next);
            }}
          />
          <IconButton label="Voice input">
            <HugeiconsIcon icon={Mic01Icon} size={16} strokeWidth={1.75} />
          </IconButton>
          <ComposerSubmit busy={busy} canSend={canSend} onStop={onStop} />
        </div>
      </div>
    </form>
  );
}
