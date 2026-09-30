"use client";

import { cn } from "cn";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";

import {
  OPENCODE_DEFAULT_AGENT,
  OPENCODE_DEFAULT_EFFORT,
  OPENCODE_DEFAULT_MODEL,
  OPENCODE_DEFAULT_PLACEHOLDER,
  OPENCODE_DEFAULT_PROVIDER,
} from "../constants/opencode";
import type { OpencodeComposerProps } from "../types/opencode";
import { OpencodeProgress } from "./opencode-progress";

const KBD_CLASS =
  "text-opencode-fg font-opencode h-auto min-w-0 rounded-none bg-transparent p-0 text-[length:inherit] font-normal";

export const OpencodeComposer = ({
  agent = OPENCODE_DEFAULT_AGENT,
  "aria-label": ariaLabel = "Prompt",
  busy = false,
  className,
  context,
  cwd,
  effort = OPENCODE_DEFAULT_EFFORT,
  inputClassName,
  model = OPENCODE_DEFAULT_MODEL,
  placeholder = OPENCODE_DEFAULT_PLACEHOLDER,
  provider = OPENCODE_DEFAULT_PROVIDER,
  ...props
}: OpencodeComposerProps) => (
  <div
    className={cn("flex min-w-0 flex-col gap-[1lh]", className)}
    data-slot="opencode-composer"
  >
    <InputGroup className="border-opencode-blue bg-opencode-panel dark:bg-opencode-panel has-[[data-slot=input-group-control]:focus-visible]:border-opencode-blue h-auto flex-col items-stretch gap-[0.5lh] rounded-none border-0 border-s-2 py-[0.5lh] ps-[calc(3ch-2px)] pe-[2ch] has-[[data-slot=input-group-control]:focus-visible]:ring-0 has-[>[data-align=block-end]]:[&>input]:pt-0">
      <InputGroupInput
        aria-label={ariaLabel}
        className={cn(
          "peer text-opencode-fg caret-opencode-fg placeholder:text-opencode-muted h-[1lh] px-0 py-0 text-[length:inherit] leading-[inherit] md:text-[length:inherit] [&:placeholder-shown:not(:focus)]:indent-[1ch]",
          inputClassName
        )}
        placeholder={placeholder}
        type="text"
        {...props}
      />
      <span
        aria-hidden="true"
        className="bg-opencode-fg pointer-events-none absolute start-[calc(3ch-2px)] top-[0.5lh] hidden h-[1lh] w-[1ch] peer-[:placeholder-shown:not(:focus)]:block"
      />
      <InputGroupAddon
        align="block-end"
        className="min-w-0 cursor-default flex-wrap justify-start gap-x-[1ch] gap-y-0 p-0 text-[length:inherit] leading-[inherit] font-normal group-has-[>input]/input-group:pb-0"
      >
        <span className="text-opencode-blue">{agent}</span>
        <span aria-hidden="true" className="text-opencode-muted">
          ·
        </span>
        <span className="text-opencode-fg">{model}</span>
        <span className="text-opencode-muted">{provider}</span>
        <span aria-hidden="true" className="text-opencode-muted">
          ·
        </span>
        <span className="text-opencode-orange font-bold">{effort}</span>
      </InputGroupAddon>
    </InputGroup>
    <div className="text-opencode-muted flex min-w-0 items-center justify-between gap-[2ch] ps-[1ch]">
      {busy ? (
        <span className="flex min-w-0 items-center gap-[2ch]">
          <OpencodeProgress />
          <span>
            <Kbd className={KBD_CLASS}>esc</Kbd> interrupt
          </span>
        </span>
      ) : (
        <span className="min-w-0 truncate">{cwd}</span>
      )}
      <span className="flex shrink-0 items-center gap-[2ch]">
        {context ? (
          <span className="tabular-nums">{context}</span>
        ) : (
          <span>
            <Kbd className={KBD_CLASS}>tab</Kbd> agents
          </span>
        )}
        <span>
          <Kbd className={KBD_CLASS}>ctrl+p</Kbd> commands
        </span>
      </span>
    </div>
  </div>
);
