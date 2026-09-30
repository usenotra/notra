"use client";

import { ArrowUp02Icon, PlusSignIcon, StopIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChatgptModelSelector } from "@notra/ui/components/ai-skins/chatgpt/chatgpt-model-selector";
import { cn } from "@notra/ui/lib/utils";
import type { FormEvent } from "react";
import { useState } from "react";
import { CHATGPT_DEFAULT_EFFORT, CHATGPT_DEFAULT_MODEL } from "../../../constants/chatgpt-models";
import type { ChatgptEffortId, ChatgptModelId } from "../../../types/chatgpt";

export function ChatgptComposer({
  onSend,
  onStop,
  placeholder = "Ask anything",
  busy = false,
  model: modelProp,
  defaultModel = CHATGPT_DEFAULT_MODEL,
  onModelChange,
  effort: effortProp,
  defaultEffort = CHATGPT_DEFAULT_EFFORT,
  onEffortChange,
  className,
}: {
  onSend?: (text: string) => void;
  onStop?: () => void;
  placeholder?: string;
  busy?: boolean;
  model?: ChatgptModelId;
  defaultModel?: ChatgptModelId;
  onModelChange?: (model: ChatgptModelId) => void;
  effort?: ChatgptEffortId;
  defaultEffort?: ChatgptEffortId;
  onEffortChange?: (effort: ChatgptEffortId) => void;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [uncontrolledModel, setUncontrolledModel] = useState(defaultModel);
  const [uncontrolledEffort, setUncontrolledEffort] = useState(defaultEffort);
  const model = modelProp ?? uncontrolledModel;
  const effort = effortProp ?? uncontrolledEffort;
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
    <form
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-black/8 bg-background px-2 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.04)] dark:border-white/10 dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)]",
        className
      )}
      onSubmit={handleSubmit}
    >
      <button
        aria-label="Add"
        className="flex size-6 shrink-0 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
        type="button"
      >
        <HugeiconsIcon icon={PlusSignIcon} size={16} strokeWidth={1.75} />
      </button>
      <input
        aria-label="Message"
        className="min-w-0 flex-1 bg-transparent py-2 pr-3 text-[15px] outline-none placeholder:text-muted-foreground"
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
      <ChatgptModelSelector
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
      <button
        aria-label={busy ? "Stop" : "Send"}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:bg-blue-600/35 disabled:text-white"
        disabled={busy ? false : !canSend}
        onClick={
          busy
            ? (event) => {
                event.preventDefault();
                onStop?.();
              }
            : undefined
        }
        type={busy ? "button" : "submit"}
      >
        <HugeiconsIcon
          icon={busy ? StopIcon : ArrowUp02Icon}
          size={busy ? 12 : 16}
          strokeWidth={2}
        />
      </button>
    </form>
  );
}
