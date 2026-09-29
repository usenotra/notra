"use client";

import { cn } from "cn";
import { ArrowUpIcon, PlusIcon, SquareIcon } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

import {
  CHATGPT_DEFAULT_EFFORT,
  CHATGPT_DEFAULT_MODEL,
} from "../constants/chatgpt-models";
import type {
  ChatgptComposerProps,
  ChatgptEffortId,
  ChatgptModelId,
} from "../types/chatgpt";
import { ChatgptModelSelector } from "./chatgpt-model-selector";

const sendClassName =
  "bg-chatgpt-send text-chatgpt-send-fg hover:bg-chatgpt-send-hover hover:text-chatgpt-send-fg focus-visible:ring-chatgpt-focus/35 dark:hover:bg-chatgpt-send-hover size-9 rounded-full border-0 transition-colors duration-150 focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0 motion-reduce:transition-none";

export const ChatgptComposer = ({
  busy = false,
  className,
  defaultEffort = CHATGPT_DEFAULT_EFFORT,
  defaultModel = CHATGPT_DEFAULT_MODEL,
  effort: effortProp,
  efforts,
  model: modelProp,
  models,
  onEffortChange,
  onModelChange,
  onSend,
  onStop,
  placeholder = "Ask anything",
  ...props
}: ChatgptComposerProps) => {
  const [value, setValue] = useState("");
  const [uncontrolledModel, setUncontrolledModel] = useState(defaultModel);
  const [uncontrolledEffort, setUncontrolledEffort] = useState(defaultEffort);
  const model = modelProp ?? uncontrolledModel;
  const effort = effortProp ?? uncontrolledEffort;
  const canSend = value.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = value.trim();
    if (!text || busy) {
      return;
    }
    onSend?.(text);
    if (onSend) {
      setValue("");
    }
  };

  const handleModelChange = (next: ChatgptModelId) => {
    if (modelProp === undefined) {
      setUncontrolledModel(next);
    }
    onModelChange?.(next);
  };

  const handleEffortChange = (next: ChatgptEffortId) => {
    if (effortProp === undefined) {
      setUncontrolledEffort(next);
    }
    onEffortChange?.(next);
  };

  return (
    <form
      className="font-chatgpt w-full"
      data-slot="chatgpt-composer"
      onSubmit={handleSubmit}
      {...props}
    >
      <InputGroup
        className={cn(
          "bg-chatgpt-composer border-chatgpt-composer-border has-disabled:bg-chatgpt-composer dark:has-disabled:bg-chatgpt-composer text-chatgpt-fg shadow-chatgpt-composer has-[[data-slot=input-group-control]:focus-visible]:border-chatgpt-composer-border dark:bg-chatgpt-composer h-auto min-h-13 gap-1.5 rounded-[1.75rem] px-2 py-2 has-disabled:opacity-100 has-[[data-slot=input-group-control]:focus-visible]:ring-0",
          className
        )}
      >
        <InputGroupAddon
          align="inline-start"
          className="p-0 has-[>button]:ml-0"
        >
          <InputGroupButton
            aria-label="Add"
            className="text-chatgpt-fg/80 hover:bg-chatgpt-hover hover:text-chatgpt-fg focus-visible:ring-chatgpt-focus/35 dark:hover:bg-chatgpt-hover size-9 rounded-full border-0 transition-colors duration-150 focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0 motion-reduce:transition-none"
            size="icon-xs"
          >
            <PlusIcon className="size-5" strokeWidth={1.5} />
          </InputGroupButton>
        </InputGroupAddon>
        <InputGroupInput
          aria-label="Message"
          className="placeholder:text-chatgpt-muted h-auto py-1.5 pr-3! pl-0! text-base md:text-base"
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          type="text"
          value={value}
        />
        <InputGroupAddon
          align="inline-end"
          className="gap-1.5 p-0 has-[>button]:mr-0"
        >
          <ChatgptModelSelector
            effort={effort}
            efforts={efforts}
            model={model}
            models={models}
            onEffortChange={handleEffortChange}
            onModelChange={handleModelChange}
          />
          {busy ? (
            <InputGroupButton
              aria-label="Stop"
              className={sendClassName}
              onClick={onStop}
              size="icon-sm"
            >
              <SquareIcon className="size-3.5 fill-current" strokeWidth={2} />
            </InputGroupButton>
          ) : (
            <InputGroupButton
              aria-label="Send"
              className={cn(
                sendClassName,
                "disabled:bg-chatgpt-send/35 disabled:text-chatgpt-send-fg disabled:opacity-100"
              )}
              disabled={!canSend}
              size="icon-sm"
              type="submit"
            >
              <ArrowUpIcon className="size-5" strokeWidth={2} />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
};
