"use client";

import {
  ArrowUp02Icon,
  Mic01Icon,
  PlusSignIcon,
  StopIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ClaudeChatModelSelector } from "@notra/ui/components/ai-skins/claude-chat/claude-chat-model-selector";
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
  CLAUDE_CHAT_DEFAULT_EFFORT,
  CLAUDE_CHAT_DEFAULT_MODEL,
} from "../../../constants/claude-chat-models";
import type {
  ClaudeChatEffortId,
  ClaudeChatModelId,
} from "../../../types/claude-chat";

function WaveformGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="currentColor"
      viewBox="0 0 16 16"
    >
      <rect height="6" rx="0.9" width="1.7" x="1.4" y="5" />
      <rect height="10" rx="0.9" width="1.7" x="5.2" y="3" />
      <rect height="7.5" rx="0.9" width="1.7" x="9" y="4.25" />
      <rect height="11" rx="0.9" width="1.7" x="12.8" y="2.5" />
    </svg>
  );
}

const ACTION_EASE =
  "ease-emphasized motion-reduce:transition-opacity motion-reduce:transform-none";

function ToolbarButton({
  label,
  onClick,
  type = "button",
  className,
  children,
}: {
  label: string;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  children: ReactNode;
}) {
  return (
    <InputGroupButton
      aria-label={label}
      className={cn(
        AI_SKIN_BUTTON_RESET,
        "size-8 shrink-0 rounded-full text-[#1f1e1b] transition-colors duration-fast hover:bg-[#eceae4] hover:text-[#1f1e1b] dark:text-foreground dark:hover:bg-white/10 dark:hover:text-foreground",
        className
      )}
      onClick={onClick}
      size="icon-sm"
      type={type}
    >
      {children}
    </InputGroupButton>
  );
}

function ActionGlyph({
  show,
  children,
}: {
  show: boolean;
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden={!show}
      className={cn(
        "absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-normal",
        ACTION_EASE,
        show
          ? "scale-100 opacity-100"
          : "pointer-events-none scale-[0.92] opacity-0"
      )}
    >
      {children}
    </span>
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
  const filled = busy || canSend;
  const label = busy ? "Stop" : canSend ? "Send" : "Voice";

  return (
    <InputGroupButton
      aria-label={label}
      className={cn(
        AI_SKIN_BUTTON_RESET,
        "relative size-8 shrink-0 rounded-full transition-[background-color,color] duration-normal ease-emphasized motion-reduce:transition-none",
        filled
          ? "bg-[#1f1e1b] text-white hover:bg-black hover:text-white dark:bg-white dark:text-[#1f1e1b] dark:hover:bg-white/90 dark:hover:text-[#1f1e1b]"
          : "text-[#1f1e1b] hover:bg-[#eceae4] hover:text-[#1f1e1b] dark:text-foreground dark:hover:bg-white/10 dark:hover:text-foreground"
      )}
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
      <ActionGlyph show={!busy && !canSend}>
        <WaveformGlyph className="size-4" />
      </ActionGlyph>
      <ActionGlyph show={!busy && canSend}>
        <HugeiconsIcon icon={ArrowUp02Icon} size={16} strokeWidth={2} />
      </ActionGlyph>
      <ActionGlyph show={busy}>
        <HugeiconsIcon icon={StopIcon} size={12} strokeWidth={2} />
      </ActionGlyph>
    </InputGroupButton>
  );
}

export function ClaudeChatComposer({
  onSend,
  onStop,
  placeholder = "Nachricht schreiben...",
  model: modelProp,
  defaultModel = CLAUDE_CHAT_DEFAULT_MODEL,
  onModelChange,
  effort: effortProp,
  defaultEffort = CLAUDE_CHAT_DEFAULT_EFFORT,
  onEffortChange,
  disclaimer = "Claude ist eine KI und kann Fehler machen. Bitte überprüfe die Antworten.",
  busy = false,
  className,
}: {
  onSend?: (text: string) => void;
  onStop?: () => void;
  placeholder?: string;
  model?: ClaudeChatModelId;
  defaultModel?: ClaudeChatModelId;
  onModelChange?: (model: ClaudeChatModelId) => void;
  effort?: ClaudeChatEffortId;
  defaultEffort?: ClaudeChatEffortId;
  onEffortChange?: (effort: ClaudeChatEffortId) => void;
  disclaimer?: string | null;
  busy?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [uncontrolledModel, setUncontrolledModel] = useState(defaultModel);
  const [uncontrolledEffort, setUncontrolledEffort] = useState(defaultEffort);
  const model = modelProp ?? uncontrolledModel;
  const effort = effortProp ?? uncontrolledEffort;
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

  return (
    <div className={cn("w-full", className)}>
      <form onSubmit={handleSubmit}>
        <InputGroup
          className={cn(
            AI_SKIN_INPUT_GROUP_RESET,
            "flex-col items-stretch rounded-[1.75rem] border-[#e5e5e5] bg-white px-3.5 pt-3 pb-2 shadow-[0_1px_2px_rgba(31,30,27,0.04)] has-disabled:bg-white has-[[data-slot=input-group-control]:focus-visible]:border-[#e5e5e5] dark:border-white/10 dark:bg-white/6 dark:shadow-none dark:has-disabled:bg-white/6 dark:has-[[data-slot=input-group-control]:focus-visible]:border-white/10"
          )}
        >
          <InputGroupTextarea
            aria-label="Message"
            className="field-sizing-content max-h-80 min-h-[3.25rem] w-full flex-none resize-none overflow-y-auto bg-transparent px-1.5 pt-0.5 pb-2 font-sans text-[15px] leading-6 text-[#1f1e1b] outline-none transition-none placeholder:text-[#9b9b9b] md:text-[15px] dark:text-foreground"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={2}
            value={value}
          />
          <InputGroupAddon
            align="block-end"
            className={cn(AI_SKIN_INPUT_GROUP_ADDON_RESET, "justify-between gap-2")}
          >
            <ToolbarButton label="Add">
              <HugeiconsIcon icon={PlusSignIcon} size={18} strokeWidth={1.75} />
            </ToolbarButton>
            <div className="flex items-center gap-0.5">
              <ClaudeChatModelSelector
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
              <ToolbarButton label="Voice input">
                <HugeiconsIcon icon={Mic01Icon} size={16} strokeWidth={1.75} />
              </ToolbarButton>
              <ComposerSubmit busy={busy} canSend={canSend} onStop={onStop} />
            </div>
          </InputGroupAddon>
        </InputGroup>
      </form>
      {disclaimer ? (
        <p className="mt-2 text-center font-sans text-[11px] leading-4 text-[#9b9b9b]">
          {disclaimer}
        </p>
      ) : null}
    </div>
  );
}
