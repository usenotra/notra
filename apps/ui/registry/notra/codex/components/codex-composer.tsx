import { cn } from "cn";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";

import {
  CODEX_DEFAULT_CONTEXT,
  CODEX_DEFAULT_PLACEHOLDER,
} from "../constants/codex";
import type { CodexComposerProps } from "../types/codex";

export const CodexComposer = ({
  "aria-label": ariaLabel = "Prompt",
  className,
  context = CODEX_DEFAULT_CONTEXT,
  inputClassName,
  placeholder = CODEX_DEFAULT_PLACEHOLDER,
  ...props
}: CodexComposerProps) => (
  <div
    className={cn(
      "group/codex-composer font-codex min-w-0 text-[0.8125rem] leading-[1.3]",
      className
    )}
    data-slot="codex-composer"
  >
    <Separator className="bg-codex-rule group-focus-within/codex-composer:bg-codex-green/60 transition-colors duration-150 motion-reduce:transition-none" />
    <InputGroup className="h-auto rounded-none border-0 bg-transparent pt-[0.325rem] has-[[data-slot=input-group-control]:focus-visible]:ring-0 dark:bg-transparent has-[>[data-align=inline-start]]:[&>input]:pl-[1ch]">
      <InputGroupAddon className="text-codex-green cursor-text p-0 text-[length:inherit] leading-[inherit] font-normal">
        <span aria-hidden="true">›</span>
      </InputGroupAddon>
      <InputGroupInput
        aria-label={ariaLabel}
        className={cn(
          "text-codex-fg caret-codex-fg placeholder:text-codex-placeholder h-auto py-0 pe-0 text-[0.8125rem] leading-[1.3] md:text-[0.8125rem]",
          inputClassName
        )}
        placeholder={placeholder}
        type="text"
        {...props}
      />
    </InputGroup>
    <div className="text-codex-dim mt-[1.3em] flex min-w-0 flex-wrap justify-between gap-x-[2ch]">
      <span>
        <Kbd className="text-codex-dim font-codex h-auto min-w-0 rounded-none bg-transparent p-0 text-[length:inherit] font-normal">
          ?
        </Kbd>{" "}
        for shortcuts
      </span>
      <span>{context}</span>
    </div>
  </div>
);
