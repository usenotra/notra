"use client";

import {
  ArrowUp02Icon,
  Mic01Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GeminiModelSelector } from "@notra/ui/components/ai-skins/gemini/gemini-model-selector";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@notra/ui/components/ui/input-group";
import {
  AI_SKIN_BUTTON_RESET,
  AI_SKIN_INPUT_GROUP_ADDON_RESET,
  AI_SKIN_INPUT_GROUP_RESET,
} from "@notra/ui/constants/ai-skin-primitives";
import { cn } from "@notra/ui/lib/utils";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { GEMINI_DEFAULT_MODEL } from "../../../constants/gemini-models";
import type { GeminiModelId } from "../../../types/gemini";

const ACTION_EASE =
  "ease-emphasized motion-reduce:transition-opacity motion-reduce:transform-none";

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
  const label = busy ? "Stop" : canSend ? "Send" : "Voice input";

  return (
    <InputGroupButton
      aria-label={label}
      className={cn(
        AI_SKIN_BUTTON_RESET,
        "relative size-9 shrink-0 rounded-full transition-[background-color,color] duration-normal",
        ACTION_EASE,
        busy
          ? "bg-[#e8eaed] text-[#1f1f1f] hover:bg-[#dadce0] hover:text-[#1f1f1f] dark:bg-white/12 dark:text-foreground dark:hover:bg-white/16 dark:hover:text-foreground"
          : filled
            ? "bg-[#1f1f1f] text-white hover:bg-black hover:text-white dark:bg-white dark:text-[#1f1f1f] dark:hover:bg-white/90 dark:hover:text-[#1f1f1f]"
            : "text-[#1f1f1f] hover:bg-[#f1f3f4] hover:text-[#1f1f1f] dark:text-foreground dark:hover:bg-white/10 dark:hover:text-foreground"
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
        <HugeiconsIcon icon={Mic01Icon} size={18} strokeWidth={1.75} />
      </ActionGlyph>
      <ActionGlyph show={!busy && canSend}>
        <HugeiconsIcon icon={ArrowUp02Icon} size={16} strokeWidth={2} />
      </ActionGlyph>
      <ActionGlyph show={busy}>
        <span className="block size-3 rounded-[2.5px] bg-current" />
      </ActionGlyph>
    </InputGroupButton>
  );
}

export function GeminiComposer({
  onSend,
  onStop,
  placeholder = "Frag Gemini",
  model: modelProp,
  defaultModel = GEMINI_DEFAULT_MODEL,
  onModelChange,
  disclaimer = "Gemini ist eine KI und kann Fehler machen, auch bei Informationen über Personen.",
  privacyLabel = "Datenschutz und Gemini",
  busy = false,
  className,
}: {
  onSend?: (text: string) => void;
  onStop?: () => void;
  placeholder?: string;
  model?: GeminiModelId;
  defaultModel?: GeminiModelId;
  onModelChange?: (model: GeminiModelId) => void;
  disclaimer?: string | null;
  privacyLabel?: string;
  busy?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [uncontrolledModel, setUncontrolledModel] = useState(defaultModel);
  const model = modelProp ?? uncontrolledModel;
  const canSend = value.trim().length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = value.trim();
    if (!text || busy) {
      return;
    }
    onSend?.(text);
    if (onSend) {
      setValue("");
    }
  }

  return (
    <div className={cn("w-full", className)}>
      <form onSubmit={handleSubmit}>
        <InputGroup
          className={cn(
            AI_SKIN_INPUT_GROUP_RESET,
            "gap-1 rounded-full border-black/[0.04] bg-white py-2 pr-1.5 pl-2 shadow-[0_1px_2px_rgba(60,64,67,0.08),0_2px_12px_rgba(60,64,67,0.08)] has-disabled:bg-white has-[>[data-align=inline-end]]:[&>input]:pr-2 has-[>[data-align=inline-start]]:[&>input]:pl-0 has-[[data-slot=input-group-control]:focus-visible]:border-black/[0.04] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_1px_2px_rgba(0,0,0,0.24)] dark:has-disabled:bg-white/6 dark:has-[[data-slot=input-group-control]:focus-visible]:border-white/10"
          )}
        >
          <InputGroupAddon className={AI_SKIN_INPUT_GROUP_ADDON_RESET}>
            <InputGroupButton
              aria-label="Add"
              className={cn(
                AI_SKIN_BUTTON_RESET,
                "size-9 shrink-0 rounded-full text-[#1f1f1f] transition-colors hover:bg-[#f1f3f4] hover:text-[#1f1f1f] dark:text-foreground dark:hover:bg-white/10 dark:hover:text-foreground"
              )}
              size="icon-sm"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={20} strokeWidth={1.6} />
            </InputGroupButton>
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Message"
            className="h-auto min-w-0 flex-1 rounded-none px-0 py-2 pr-2 text-[16px] text-[#1f1f1f] transition-none placeholder:text-[#80868b] md:text-[16px] dark:text-foreground"
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            type="text"
            value={value}
          />
          <InputGroupAddon
            align="inline-end"
            className={cn(AI_SKIN_INPUT_GROUP_ADDON_RESET, "gap-1")}
          >
            <GeminiModelSelector
              model={model}
              onModelChange={(next) => {
                if (modelProp === undefined) {
                  setUncontrolledModel(next);
                }
                onModelChange?.(next);
              }}
            />
            <ComposerSubmit busy={busy} canSend={canSend} onStop={onStop} />
          </InputGroupAddon>
        </InputGroup>
      </form>
      {disclaimer ? (
        <p className="mt-2.5 text-center text-[12px] leading-4 text-[#80868b]">
          {disclaimer}{" "}
          <span className="underline decoration-[#80868b] underline-offset-2">
            {privacyLabel}
          </span>
        </p>
      ) : null}
    </div>
  );
}
