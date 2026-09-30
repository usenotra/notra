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
import { PerplexityModelSelector } from "@notra/ui/components/ai-skins/perplexity/perplexity-model-selector";
import { Button } from "@notra/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@notra/ui/components/ui/input-group";
import {
  AI_SKIN_BUTTON_RESET,
  AI_SKIN_INPUT_GROUP_ADDON_RESET,
  AI_SKIN_INPUT_GROUP_RESET,
} from "@notra/ui/constants/ai-skin-primitives";
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
    <InputGroupButton
      aria-label={label}
      className={cn(
        AI_SKIN_BUTTON_RESET,
        "size-8 shrink-0 rounded-full text-[#3d3d3d] outline-none transition-[background-color,transform] duration-fast hover:bg-[#f3f3f3] hover:text-[#3d3d3d] focus-visible:ring-2 focus-visible:ring-black/15 active:scale-[0.96] dark:text-foreground dark:hover:bg-white/10 dark:hover:text-foreground",
        className
      )}
      size="icon-sm"
    >
      {children}
    </InputGroupButton>
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
    <InputGroupButton
      aria-label={busy ? "Stop" : "Send"}
      className={cn(
        AI_SKIN_BUTTON_RESET,
        "size-8 shrink-0 rounded-full outline-none transition-[background-color,color,opacity,transform] duration-fast focus-visible:ring-2 focus-visible:ring-black/15 active:scale-[0.96]",
        enabled
          ? "bg-[#2a2a2a] text-white hover:bg-[#1a1a1a] hover:text-white dark:bg-white dark:text-[#1a1a1a] dark:hover:bg-white/90 dark:hover:text-[#1a1a1a]"
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
      size="icon-sm"
      type={canSend && !busy ? "submit" : "button"}
    >
      <HugeiconsIcon
        icon={busy ? StopIcon : ArrowUp02Icon}
        size={busy ? 12 : 16}
        strokeWidth={2}
      />
    </InputGroupButton>
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
    <form className="contents" onSubmit={handleSubmit}>
      <InputGroup
        className={cn(
          AI_SKIN_INPUT_GROUP_RESET,
          "flex-col items-stretch rounded-[1.65rem] border-black/[0.08] bg-white px-3 pt-3 pb-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] has-disabled:bg-white has-[[data-slot=input-group-control]:focus-visible]:border-black/[0.08] dark:border-white/10 dark:bg-[#1c1c1c] dark:shadow-none dark:has-disabled:bg-[#1c1c1c] dark:has-[[data-slot=input-group-control]:focus-visible]:border-white/10",
          className
        )}
      >
        <InputGroupTextarea
          aria-label="Follow-up"
          className="field-sizing-content max-h-80 min-h-[2.75rem] w-full flex-none resize-none overflow-y-auto bg-transparent px-1.5 pt-0.5 pb-2 font-sans text-[15px] leading-6 text-[#1a1a1a] outline-none transition-none placeholder:text-[#8d8d8d] md:text-[15px] dark:text-foreground"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          value={value}
        />
        <InputGroupAddon
          align="block-end"
          className={cn(AI_SKIN_INPUT_GROUP_ADDON_RESET, "justify-between gap-2")}
        >
          <div className="flex min-w-0 items-center gap-0.5">
            <IconButton label="Add">
              <HugeiconsIcon icon={PlusSignIcon} size={16} strokeWidth={1.75} />
            </IconButton>
            <DropdownMenu onOpenChange={setFocusOpen} open={focusOpen}>
              <DropdownMenuTrigger
                render={
                  <Button
                    aria-label={`Focus ${selectedFocus.label}`}
                    className={cn(
                      AI_SKIN_BUTTON_RESET,
                      CHIP_CLASS,
                      "text-[#3d3d3d] hover:bg-[#f3f3f3] hover:text-[#3d3d3d] aria-expanded:bg-[#f3f3f3] aria-expanded:text-[#3d3d3d] dark:text-foreground dark:hover:bg-white/10 dark:hover:text-foreground dark:aria-expanded:bg-white/10 dark:aria-expanded:text-foreground",
                      focusOpen && "bg-[#f3f3f3] dark:bg-white/10"
                    )}
                    type="button"
                    variant="ghost"
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
                <DropdownMenuRadioGroup
                  onValueChange={(value) => {
                    const next = PERPLEXITY_FOCUS_OPTIONS.find(
                      (option) => option.id === value
                    );
                    if (next) {
                      setFocus(next.id);
                    }
                  }}
                  value={focus}
                >
                  {PERPLEXITY_FOCUS_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem
                      className="cursor-pointer flex-col items-start gap-0.5 rounded-[0.95rem] px-2.5 py-2 data-highlighted:bg-[#f3f3f3] dark:data-highlighted:bg-white/10 [&_[data-slot=dropdown-menu-radio-item-indicator]]:hidden"
                      closeOnClick
                      key={option.id}
                      value={option.id}
                    >
                      <span className="font-medium text-[13px]">
                        {option.label}
                      </span>
                      <span className="text-[12px] text-[#6b6b6b] dark:text-muted-foreground">
                        {option.description}
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
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
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
