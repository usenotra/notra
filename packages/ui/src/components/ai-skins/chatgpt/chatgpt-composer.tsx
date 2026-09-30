"use client";

import { ArrowUp02Icon, PlusSignIcon, StopIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChatgptModelSelector } from "@notra/ui/components/ai-skins/chatgpt/chatgpt-model-selector";
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
    <form className="contents" onSubmit={handleSubmit}>
      <InputGroup
        className={cn(
          AI_SKIN_INPUT_GROUP_RESET,
          "gap-1.5 rounded-full border-black/8 bg-background px-2 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.04)] has-[>[data-align=inline-end]]:[&>input]:pr-3 has-[>[data-align=inline-start]]:[&>input]:pl-0 has-disabled:bg-background has-[[data-slot=input-group-control]:focus-visible]:border-black/8 dark:border-white/10 dark:bg-background dark:has-disabled:bg-background dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)] dark:has-[[data-slot=input-group-control]:focus-visible]:border-white/10",
          className
        )}
      >
        <InputGroupAddon className={AI_SKIN_INPUT_GROUP_ADDON_RESET}>
          <InputGroupButton
            aria-label="Add"
            className={cn(
              AI_SKIN_BUTTON_RESET,
              "size-8 rounded-full text-foreground/80 transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted"
            )}
            size="icon-xs"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={18} strokeWidth={1.75} />
          </InputGroupButton>
        </InputGroupAddon>
        <InputGroupInput
          aria-label="Message"
          className="h-auto min-w-0 flex-1 rounded-none px-0 py-2 pr-3 text-[15px] transition-none placeholder:text-muted-foreground md:text-[15px]"
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          type="text"
          value={value}
        />
        <InputGroupAddon
          align="inline-end"
          className={cn(AI_SKIN_INPUT_GROUP_ADDON_RESET, "gap-1.5")}
        >
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
          <InputGroupButton
            aria-label={busy ? "Stop" : "Send"}
            className={cn(
              AI_SKIN_BUTTON_RESET,
              "size-8 rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 hover:text-white disabled:bg-blue-600/35 disabled:text-white dark:hover:bg-blue-700"
            )}
            disabled={busy ? false : !canSend}
            onClick={
              busy
                ? (event) => {
                    event.preventDefault();
                    onStop?.();
                  }
                : undefined
            }
            size="icon-sm"
            type={busy ? "button" : "submit"}
          >
            <HugeiconsIcon
              icon={busy ? StopIcon : ArrowUp02Icon}
              size={busy ? 12 : 16}
              strokeWidth={2}
            />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
