import { cn } from "cn";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";

import { OPENCODE_DEFAULT_PLACEHOLDER } from "../constants/opencode";
import type { OpencodeComposerProps } from "../types/opencode";

const KBD_CLASS =
  "text-opencode-fg h-auto min-w-0 rounded-none bg-transparent p-0 font-opencode text-[length:inherit] font-normal";

export const OpencodeComposer = ({
  agent = "Build",
  "aria-label": ariaLabel = "Prompt",
  className,
  context,
  effort = "low",
  inputClassName,
  model = "GPT-5.6 Sol",
  placeholder = OPENCODE_DEFAULT_PLACEHOLDER,
  provider = "OpenAI",
  ...props
}: OpencodeComposerProps) => (
  <div
    className={cn("font-opencode min-w-0", className)}
    data-slot="opencode-composer"
  >
    <InputGroup className="border-opencode-purple bg-opencode-surface has-[[data-slot=input-group-control]:focus-visible]:border-opencode-purple dark:bg-opencode-surface h-auto items-stretch rounded-none border-0 border-s-2 px-[2ch] py-[1.0625rem] has-[[data-slot=input-group-control]:focus-visible]:ring-0 has-[>[data-align=block-end]]:[&>input]:pt-0">
      <InputGroupInput
        aria-label={ariaLabel}
        className={cn(
          "text-opencode-fg caret-opencode-fg placeholder:text-opencode-muted h-auto px-0 py-0 text-[0.8125rem] leading-[1.3] md:text-[0.8125rem]",
          inputClassName
        )}
        placeholder={placeholder}
        type="text"
        {...props}
      />
      <InputGroupAddon
        align="block-end"
        className="mt-[1.0625rem] cursor-default flex-wrap gap-x-[1ch] gap-y-0 p-0 text-[0.8125rem] leading-[1.3] font-normal group-has-[>input]/input-group:pb-0"
      >
        <span className="text-opencode-purple">{agent}</span>
        <span aria-hidden="true" className="text-opencode-muted">
          ·
        </span>
        <span className="text-opencode-fg">{model}</span>
        <span className="text-opencode-muted">{provider}</span>
        <span aria-hidden="true" className="text-opencode-muted">
          ·
        </span>
        <span className="text-opencode-orange font-semibold">{effort}</span>
      </InputGroupAddon>
    </InputGroup>
    <div className="text-opencode-muted flex min-w-0 items-center justify-between gap-[2ch] px-[2ch] pt-[1.0625rem] text-[0.8125rem] leading-[1.3]">
      <span>
        <Kbd className={KBD_CLASS}>tab</Kbd> agents
        <Kbd className={cn(KBD_CLASS, "ms-[2ch]")}>ctrl+p</Kbd> commands
      </span>
      {context && <span>{context}</span>}
    </div>
  </div>
);
