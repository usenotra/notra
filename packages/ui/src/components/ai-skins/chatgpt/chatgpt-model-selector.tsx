"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { cn } from "@notra/ui/lib/utils";
import {
  CHATGPT_EFFORTS,
  CHATGPT_MODELS,
} from "../../../constants/chatgpt-models";
import {
  getChatgptEffort,
  getChatgptModel,
} from "../../../lib/chatgpt-model";
import type { ChatgptEffortId, ChatgptModelId } from "../../../types/chatgpt";

const MENU_SURFACE =
  "min-w-44 overflow-x-visible overflow-y-visible rounded-2xl p-1.5 ring-0 shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_4px_16px_rgba(0,0,0,0.08)] data-closed:overflow-x-visible data-closed:overflow-y-visible dark:ring-0 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.4)]";

const ROW_TRIGGER =
  "h-9 gap-2 rounded-lg px-2.5 py-0 text-[13px] leading-none data-highlighted:bg-muted data-open:bg-muted [&_svg]:ml-0";

export function ChatgptModelSelector({
  model,
  effort,
  onModelChange,
  onEffortChange,
  className,
}: {
  model: ChatgptModelId;
  effort: ChatgptEffortId;
  onModelChange?: (model: ChatgptModelId) => void;
  onEffortChange?: (effort: ChatgptEffortId) => void;
  className?: string;
}) {
  const selectedModel = getChatgptModel(model);
  const selectedEffort = getChatgptEffort(effort);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        closeDelay={200}
        delay={75}
        openOnHover
        render={
          <button
            aria-label={`Model ${selectedModel.label}, effort ${selectedEffort.label}`}
            className={cn(
              "group/chatgpt-model flex h-8 shrink-0 items-center gap-1 rounded-full bg-transparent px-2.5 text-[13px] leading-none text-foreground outline-none transition-[background-color,transform] duration-fast hover:bg-muted focus-visible:ring-2 focus-visible:ring-blue-600/35 active:scale-[0.96] data-popup-open:bg-muted",
              className
            )}
            type="button"
          />
        }
      >
        <span>{selectedEffort.label}</span>
        <HugeiconsIcon
          className="text-muted-foreground transition-transform duration-fast group-data-popup-open/chatgpt-model:rotate-180"
          icon={ArrowDown01Icon}
          size={12}
          strokeWidth={2}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn("w-64", MENU_SURFACE)}
        side="top"
        sideOffset={8}
      >
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className={ROW_TRIGGER} openOnHover>
            <span>Model</span>
            <span className="ml-auto text-muted-foreground">
              {selectedModel.label}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className={MENU_SURFACE}
            side="right"
            sideOffset={0}
          >
            <DropdownMenuRadioGroup
              onValueChange={(value) => {
                const next = CHATGPT_MODELS.find((item) => item.id === value);
                if (next) {
                  onModelChange?.(next.id);
                }
              }}
              value={model}
            >
              {CHATGPT_MODELS.map((item) => (
                <DropdownMenuRadioItem
                  className="cursor-pointer rounded-lg py-2 pr-8 pl-2.5 text-[13px]"
                  key={item.id}
                  value={item.id}
                >
                  {item.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className={ROW_TRIGGER} openOnHover>
            <span>Effort</span>
            <span className="ml-auto text-muted-foreground">
              {selectedEffort.label}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className={MENU_SURFACE}
            side="right"
            sideOffset={0}
          >
            <DropdownMenuRadioGroup
              onValueChange={(value) => {
                const next = CHATGPT_EFFORTS.find((item) => item.id === value);
                if (next) {
                  onEffortChange?.(next.id);
                }
              }}
              value={effort}
            >
              {CHATGPT_EFFORTS.map((item) => (
                <DropdownMenuRadioItem
                  className="cursor-pointer rounded-lg py-2 pr-8 pl-2.5 text-[13px]"
                  key={item.id}
                  value={item.id}
                >
                  {item.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
