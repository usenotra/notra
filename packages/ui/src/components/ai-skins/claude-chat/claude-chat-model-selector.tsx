"use client";

import {
  ArrowDown01Icon,
  InformationCircleIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { cn } from "@notra/ui/lib/utils";
import { CLAUDE_CHAT_EFFORTS } from "../../../constants/claude-chat-models";
import {
  getClaudeChatEffort,
  getClaudeChatModel,
  getOtherClaudeChatModels,
} from "../../../lib/claude-chat-model";
import type {
  ClaudeChatEffortId,
  ClaudeChatModelId,
  ClaudeChatModelOption,
} from "../../../types/claude-chat";

const MENU_SURFACE =
  "min-w-44 rounded-2xl p-1.5 shadow-[0_8px_30px_rgba(31,30,27,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]";

const ROW_TRIGGER =
  "h-9 gap-2 rounded-lg px-2.5 py-0 font-sans text-[13px] leading-none text-[#1f1e1b] data-highlighted:bg-[#eceae4] data-open:bg-[#eceae4] dark:text-foreground dark:data-highlighted:bg-white/10 dark:data-open:bg-white/10";

export function ClaudeChatModelSelector({
  model,
  effort,
  onModelChange,
  onEffortChange,
  className,
}: {
  model: ClaudeChatModelId;
  effort: ClaudeChatEffortId;
  onModelChange?: (model: ClaudeChatModelId) => void;
  onEffortChange?: (effort: ClaudeChatEffortId) => void;
  className?: string;
}) {
  const selectedModel = getClaudeChatModel(model);
  const selectedEffort = getClaudeChatEffort(effort);
  const others = getOtherClaudeChatModels(model);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        closeDelay={200}
        delay={75}
        openOnHover
        render={
          <button
            aria-label={`Modell ${selectedModel.label}, Aufwand ${selectedEffort.label}`}
            className={cn(
              "group/claude-model flex h-8 items-center gap-1 rounded-full px-2 font-sans text-[13px] leading-none text-[#1f1e1b] outline-none transition-[background-color,transform] duration-fast hover:bg-[#eceae4] focus-visible:ring-2 focus-visible:ring-[#1f1e1b]/20 active:scale-[0.96] data-popup-open:bg-[#eceae4] dark:text-foreground dark:hover:bg-white/10 dark:data-popup-open:bg-white/10",
              className
            )}
            type="button"
          />
        }
      >
        <span className="font-medium">{selectedModel.label}</span>
        <span className="text-[#8a8680]">{selectedEffort.label}</span>
        <HugeiconsIcon
          className="text-[#8a8680] transition-transform duration-fast group-data-popup-open/claude-model:rotate-180"
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
        <div className="flex items-start justify-between gap-3 px-2.5 py-2">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium font-sans text-[13px] leading-4 text-[#1f1e1b] dark:text-foreground">
              {selectedModel.label}
            </span>
            <span className="font-sans text-[12px] leading-4 text-[#8a8680]">
              {selectedModel.description}
            </span>
          </span>
          <HugeiconsIcon
            className="mt-0.5 shrink-0 text-[#3b7cff]"
            icon={Tick02Icon}
            size={16}
            strokeWidth={2}
          />
        </div>
        <DropdownMenuSeparator className="mx-1 bg-[#e5e5e5] dark:bg-white/10" />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            className={cn(ROW_TRIGGER, "[&_svg]:ml-0")}
            openOnHover
          >
            <span>Aufwand</span>
            <span className="ml-auto text-[#8a8680]">
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
                const next = CLAUDE_CHAT_EFFORTS.find(
                  (item) => item.id === value
                );
                if (next) {
                  onEffortChange?.(next.id);
                }
              }}
              value={effort}
            >
              {CLAUDE_CHAT_EFFORTS.map((item) => (
                <DropdownMenuRadioItem
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-lg py-2 pr-2.5 pl-2.5 font-sans text-[13px] leading-none text-[#1f1e1b] data-highlighted:bg-[#eceae4] dark:text-foreground dark:data-highlighted:bg-white/10 [&_[data-slot=dropdown-menu-radio-item-indicator]]:hidden"
                  key={item.id}
                  value={item.id}
                >
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-md bg-[#eceae4] px-1.5 py-0.5 font-sans text-[11px] leading-none text-[#5c5a55] dark:bg-white/10 dark:text-[#b0ada6]">
                      {item.badge}
                    </span>
                  ) : null}
                  {item.info ? (
                    <HugeiconsIcon
                      aria-label={item.info}
                      className="text-[#b0ada6]"
                      icon={InformationCircleIcon}
                      size={14}
                      strokeWidth={1.75}
                    />
                  ) : null}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className={ROW_TRIGGER} openOnHover>
            Weitere Modelle
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className={cn("min-w-40", MENU_SURFACE)}
            side="right"
            sideOffset={0}
          >
            <ClaudeChatModelGroup
              models={others.latest}
              onSelect={onModelChange}
            />
            {others.latest.length > 0 && others.previous.length > 0 ? (
              <DropdownMenuSeparator className="mx-1 bg-[#e5e5e5] dark:bg-white/10" />
            ) : null}
            <ClaudeChatModelGroup
              models={others.previous}
              onSelect={onModelChange}
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ClaudeChatModelGroup({
  models,
  onSelect,
}: {
  models: ClaudeChatModelOption[];
  onSelect?: (model: ClaudeChatModelId) => void;
}) {
  return (
    <>
      {models.map((item) => (
        <DropdownMenuItem
          className="cursor-pointer rounded-lg px-2.5 py-2 font-sans text-[13px] text-[#1f1e1b] data-highlighted:bg-[#eceae4] dark:text-foreground dark:data-highlighted:bg-white/10"
          key={item.id}
          onClick={() => onSelect?.(item.id)}
        >
          {item.label}
        </DropdownMenuItem>
      ))}
    </>
  );
}
