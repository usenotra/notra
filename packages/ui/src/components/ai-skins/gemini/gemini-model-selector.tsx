"use client";

import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { cn } from "@notra/ui/lib/utils";
import { useState } from "react";
import {
  getGeminiModel,
  getGeminiModelsByGroup,
} from "../../../lib/gemini-model";
import type { GeminiModelId, GeminiModelOption } from "../../../types/gemini";

const MENU_SURFACE =
  "w-72 rounded-[1.5rem] p-1.5 shadow-[0_8px_28px_rgba(60,64,67,0.16)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.45)]";

function GeminiModelRow({
  option,
  selected,
  onSelect,
}: {
  option: GeminiModelOption;
  selected: boolean;
  onSelect?: (id: GeminiModelId) => void;
}) {
  return (
    <DropdownMenuItem
      className="cursor-pointer items-start gap-3 rounded-[1.1rem] px-2.5 py-2.5 data-highlighted:bg-[#f1f3f4] dark:data-highlighted:bg-white/10"
      onClick={() => onSelect?.(option.id)}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {selected ? (
          <HugeiconsIcon
            className="text-[#1f1f1f] dark:text-foreground"
            icon={Tick02Icon}
            size={16}
            strokeWidth={2}
          />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-[14px] leading-5 text-[#1f1f1f] dark:text-foreground">
            {option.label}
          </span>
          {option.badge ? (
            <span className="rounded-full bg-[#f1f3f4] px-2 py-0.5 font-medium text-[11px] leading-none text-[#3c4043] dark:bg-white/10 dark:text-[#e8eaed]">
              {option.badge}
            </span>
          ) : null}
        </span>
        <span className="text-[13px] leading-5 text-[#5f6368] dark:text-muted-foreground">
          {option.description}
        </span>
      </span>
    </DropdownMenuItem>
  );
}

export function GeminiModelSelector({
  model,
  onModelChange,
  className,
}: {
  model: GeminiModelId;
  onModelChange?: (model: GeminiModelId) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = getGeminiModel(model);
  const coreModels = getGeminiModelsByGroup("core");
  const thinkingModels = getGeminiModelsByGroup("thinking");

  return (
    <DropdownMenu modal={false} onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger
        render={
          <button
            aria-label={`Modell ${selected.label}`}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] leading-none text-[#3c4043] outline-none transition-[background-color,transform] duration-fast hover:bg-[#f1f3f4] focus-visible:ring-2 focus-visible:ring-[#1a73e8]/30 active:scale-[0.96] dark:text-foreground dark:hover:bg-white/10",
              open && "bg-[#f1f3f4] dark:bg-white/10",
              className
            )}
            type="button"
          />
        }
      >
        <span className="font-medium">{selected.chip}</span>
        <HugeiconsIcon
          className={cn(
            "text-[#5f6368] transition-transform duration-fast",
            open && "rotate-180"
          )}
          icon={ArrowDown01Icon}
          size={12}
          strokeWidth={2}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={MENU_SURFACE}
        side="top"
        sideOffset={10}
      >
        {coreModels.map((option) => (
          <GeminiModelRow
            key={option.id}
            onSelect={onModelChange}
            option={option}
            selected={option.id === model}
          />
        ))}
        {thinkingModels.length > 0 ? (
          <DropdownMenuSeparator className="mx-2 my-1 bg-[#e8eaed] dark:bg-white/10" />
        ) : null}
        {thinkingModels.map((option) => (
          <GeminiModelRow
            key={option.id}
            onSelect={onModelChange}
            option={option}
            selected={option.id === model}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
