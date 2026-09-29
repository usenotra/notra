"use client";

import { cn } from "cn";
import { ArrowUp, Mic, Plus, Search, Square } from "lucide-react";
import { useState } from "react";
import type { FormEvent, KeyboardEvent, MouseEvent } from "react";

import { Badge } from "@/components/ui/badge";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";

import {
  PERPLEXITY_DEFAULT_FOCUS,
  PERPLEXITY_FOCUS_OPTIONS,
  PERPLEXITY_MODELS,
  PERPLEXITY_SEARCH_FOCUS,
} from "../constants/perplexity";
import type { PerplexityComposerProps } from "../types/perplexity";
import { PerplexityModelSelector } from "./perplexity-model-selector";

const ICON_STROKE = 1.75;

const ICON_BUTTON_CLASS =
  "text-pplx-muted hover:bg-pplx-hover hover:text-pplx-fg focus-visible:ring-pplx-ring aria-expanded:bg-pplx-hover aria-expanded:text-pplx-fg dark:hover:bg-pplx-hover dark:aria-expanded:bg-pplx-hover size-8 shrink-0 rounded-full border-0 transition-[background-color,transform] duration-150 focus-visible:border-transparent focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0 active:scale-[0.96] motion-reduce:transition-none";

export const PerplexityComposer = ({
  busy = false,
  className,
  defaultModel,
  focus = PERPLEXITY_DEFAULT_FOCUS,
  focusOptions = PERPLEXITY_FOCUS_OPTIONS,
  model: modelProp,
  models = PERPLEXITY_MODELS,
  onModelChange,
  onSend,
  onStop,
  placeholder = "Ask a follow-up",
  ...props
}: PerplexityComposerProps) => {
  const [value, setValue] = useState("");
  const [uncontrolledModel, setUncontrolledModel] = useState(defaultModel);
  const model = modelProp ?? uncontrolledModel;
  const selectedFocus =
    focusOptions.find((option) => option.id === focus) ??
    PERPLEXITY_SEARCH_FOCUS;
  const canSend = value.trim().length > 0;
  const enabled = busy || canSend;

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
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const handleStop = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onStop?.();
  };

  const setModel = (next: string) => {
    if (modelProp === undefined) {
      setUncontrolledModel(next);
    }
    onModelChange?.(next);
  };

  return (
    <form
      className={cn("font-pplx w-full", className)}
      data-slot="perplexity-composer"
      onSubmit={handleSubmit}
      {...props}
    >
      <InputGroup className="border-pplx-border bg-pplx-surface has-disabled:bg-pplx-surface dark:has-disabled:bg-pplx-surface has-[[data-slot=input-group-control]:focus-visible]:border-pplx-border dark:bg-pplx-surface h-auto flex-col rounded-2xl px-3 pt-3 pb-3 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_rgb(0_0_0/0.04)] has-disabled:opacity-100 has-[[data-slot=input-group-control]:focus-visible]:ring-0 dark:shadow-none">
        <InputGroupTextarea
          aria-label="Follow-up"
          className="text-pplx-fg placeholder:text-pplx-subtle max-h-80 min-h-11 w-full overflow-y-auto px-2 pt-1 pb-2 text-base leading-6 md:text-base"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          value={value}
        />
        <InputGroupAddon
          align="block-end"
          className="text-pplx-muted cursor-default flex-wrap justify-between gap-2 p-0 font-normal"
        >
          <div className="flex min-w-0 items-center gap-0.5">
            <InputGroupButton
              aria-label="Add"
              className={ICON_BUTTON_CLASS}
              size="icon-sm"
            >
              <Plus className="size-4" strokeWidth={ICON_STROKE} />
            </InputGroupButton>
            <Badge
              className="border-pplx-border text-pplx-fg h-8 gap-1 rounded-full bg-transparent px-3 text-sm leading-5 font-normal"
              data-slot="perplexity-composer-focus"
              variant="outline"
            >
              <Search className="size-3.5" strokeWidth={ICON_STROKE} />
              {selectedFocus.label}
            </Badge>
          </div>
          <div className="ms-auto flex shrink-0 items-center gap-0.5">
            <PerplexityModelSelector
              model={model}
              models={models}
              onModelChange={setModel}
            />
            <InputGroupButton
              aria-label="Voice input"
              className={ICON_BUTTON_CLASS}
              size="icon-sm"
            >
              <Mic className="size-4" strokeWidth={ICON_STROKE} />
            </InputGroupButton>
            <InputGroupButton
              aria-label={busy ? "Stop" : "Send"}
              className={cn(
                "focus-visible:ring-pplx-ring size-8 shrink-0 rounded-full border-0 transition-[background-color,color,opacity,transform] duration-150 focus-visible:border-transparent focus-visible:ring-2 active:scale-[0.96] active:not-aria-[haspopup]:translate-y-0 disabled:opacity-100 motion-reduce:transition-none",
                enabled
                  ? "bg-pplx-send text-pplx-send-fg hover:bg-pplx-send-hover"
                  : "bg-pplx-send-disabled text-pplx-send-disabled-fg"
              )}
              disabled={!enabled}
              onClick={busy ? handleStop : undefined}
              size="icon-sm"
              type={canSend && !busy ? "submit" : "button"}
              variant="ghost"
            >
              {busy ? (
                <Square className="size-3 fill-current" strokeWidth={1.75} />
              ) : (
                <ArrowUp className="size-4" strokeWidth={1.75} />
              )}
            </InputGroupButton>
          </div>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
};
