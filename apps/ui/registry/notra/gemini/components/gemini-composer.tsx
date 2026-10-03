"use client";

import { cn } from "cn";
import { ArrowUpIcon, MicIcon, PlusIcon } from "lucide-react";
import type { FormEvent, MouseEvent, ReactNode } from "react";
import { useState } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

import {
  GEMINI_DEFAULT_MODEL,
  GEMINI_MODELS,
} from "../constants/gemini-models";
import type { GeminiComposerProps } from "../types/gemini";
import { GeminiModelSelector } from "./gemini-model-selector";

type SubmitState = "idle" | "ready" | "busy";

const SUBMIT_LABELS: Record<SubmitState, string> = {
  busy: "Stop",
  idle: "Voice input",
  ready: "Send",
};

const ICON_BUTTON =
  "focus-visible:ring-gemini-focus/30 size-9 shrink-0 rounded-full border-0 focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0";

const ActionGlyph = ({
  children,
  show,
}: {
  children: ReactNode;
  show: boolean;
}) => (
  <span
    aria-hidden="true"
    className={cn(
      "absolute inset-0 flex items-center justify-center transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-opacity",
      show
        ? "scale-100 opacity-100"
        : "pointer-events-none scale-[0.92] opacity-0"
    )}
  >
    {children}
  </span>
);

const getSubmitState = (busy: boolean, canSend: boolean): SubmitState => {
  if (busy) {
    return "busy";
  }
  return canSend ? "ready" : "idle";
};

const GeminiComposerSubmit = ({
  busy,
  canSend,
  onStop,
}: {
  busy: boolean;
  canSend: boolean;
  onStop?: () => void;
}) => {
  const state = getSubmitState(busy, canSend);
  const handleClick = busy
    ? (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        onStop?.();
      }
    : undefined;

  return (
    <InputGroupButton
      aria-label={SUBMIT_LABELS[state]}
      className="focus-visible:ring-gemini-focus/30 text-gemini-fg hover:bg-gemini-hover hover:text-gemini-fg dark:hover:bg-gemini-hover data-[state=busy]:bg-gemini-stop data-[state=busy]:hover:bg-gemini-stop-hover dark:data-[state=busy]:hover:bg-gemini-stop-hover data-[state=ready]:bg-gemini-send data-[state=ready]:text-gemini-send-fg data-[state=ready]:hover:bg-gemini-send-hover data-[state=ready]:hover:text-gemini-send-fg dark:data-[state=ready]:hover:bg-gemini-send-hover relative size-9 shrink-0 rounded-full border-0 transition-[background-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0 motion-reduce:transition-none"
      data-slot="gemini-composer-submit"
      data-state={state}
      onClick={handleClick}
      size="icon-sm"
      type={state === "ready" ? "submit" : "button"}
      variant="ghost"
    >
      <ActionGlyph show={state === "idle"}>
        <MicIcon className="size-5" strokeWidth={1.5} />
      </ActionGlyph>
      <ActionGlyph show={state === "ready"}>
        <ArrowUpIcon className="size-4.5" strokeWidth={1.75} />
      </ActionGlyph>
      <ActionGlyph show={state === "busy"}>
        <span className="block size-3.5 rounded-[0.1875rem] bg-current" />
      </ActionGlyph>
    </InputGroupButton>
  );
};

export const GeminiComposer = ({
  busy = false,
  className,
  defaultModel = GEMINI_DEFAULT_MODEL,
  disclaimer = "Gemini is AI and can make mistakes, including about people.",
  model,
  models = GEMINI_MODELS,
  onModelChange,
  onSend,
  onStop,
  placeholder = "Ask Gemini",
  privacyHref,
  privacyLabel = "Your privacy & Gemini",
  ...props
}: GeminiComposerProps) => {
  const [value, setValue] = useState("");
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

  return (
    <div
      className={cn("font-gemini w-full", className)}
      data-slot="gemini-composer"
      {...props}
    >
      <form onSubmit={handleSubmit}>
        <InputGroup className="border-gemini-composer-border bg-gemini-composer shadow-gemini-composer dark:bg-gemini-composer has-[[data-slot=input-group-control]:focus-visible]:border-gemini-composer-border h-14 gap-1 rounded-full py-0 ps-3 pe-3 has-[[data-slot=input-group-control]:focus-visible]:ring-0 has-[>[data-align=inline-end]]:[&>input]:pr-2 has-[>[data-align=inline-start]]:[&>input]:pl-0">
          <InputGroupAddon
            align="inline-start"
            className="text-gemini-fg p-0 has-[>button]:ml-0"
          >
            <InputGroupButton
              aria-label="Add files"
              className={cn(
                ICON_BUTTON,
                "text-gemini-fg hover:bg-gemini-hover hover:text-gemini-fg dark:hover:bg-gemini-hover transition-colors duration-150 motion-reduce:transition-none"
              )}
              size="icon-sm"
              variant="ghost"
            >
              <PlusIcon className="size-5" strokeWidth={1.5} />
            </InputGroupButton>
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Message"
            className="text-gemini-fg placeholder:text-gemini-placeholder h-auto py-2 ps-1 pe-2 text-[0.9375rem] leading-6 md:text-[0.9375rem]"
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            type="text"
            value={value}
          />
          <InputGroupAddon
            align="inline-end"
            className="text-gemini-fg gap-1 p-0 has-[>button]:mr-0"
          >
            <GeminiModelSelector
              defaultModel={defaultModel}
              model={model}
              models={models}
              onModelChange={onModelChange}
            />
            <GeminiComposerSubmit
              busy={busy}
              canSend={canSend}
              onStop={onStop}
            />
          </InputGroupAddon>
        </InputGroup>
      </form>
      {disclaimer ? (
        <p className="text-gemini-muted mt-2 text-center text-xs leading-4">
          {disclaimer}{" "}
          {privacyHref ? (
            <a
              className="decoration-gemini-muted focus-visible:outline-gemini-focus rounded-sm underline underline-offset-2 focus-visible:outline-2"
              href={privacyHref}
              rel="noopener noreferrer"
              target="_blank"
            >
              {privacyLabel}
            </a>
          ) : (
            <span className="decoration-gemini-muted underline underline-offset-2">
              {privacyLabel}
            </span>
          )}
        </p>
      ) : null}
    </div>
  );
};
