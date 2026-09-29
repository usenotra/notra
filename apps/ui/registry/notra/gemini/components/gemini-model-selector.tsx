"use client";

import { cn } from "cn";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  GEMINI_DEFAULT_MODEL,
  GEMINI_MODELS,
} from "../constants/gemini-models";
import { getGeminiModel, getGeminiModelsByGroup } from "../lib/gemini-model";
import type {
  GeminiModelId,
  GeminiModelOption,
  GeminiModelSelectorProps,
} from "../types/gemini";

const GeminiModelRow = ({ option }: { option: GeminiModelOption }) => (
  <DropdownMenuRadioItem
    className="focus:bg-gemini-hover focus:text-gemini-fg data-highlighted:bg-gemini-hover focus:**:text-gemini-fg text-gemini-fg cursor-pointer items-start gap-3 rounded-[1.1rem] py-2.5 pr-2.5 pl-10.5 [&_[data-slot=dropdown-menu-radio-item-indicator]]:top-2.5 [&_[data-slot=dropdown-menu-radio-item-indicator]]:right-auto [&_[data-slot=dropdown-menu-radio-item-indicator]]:left-2.5 [&_[data-slot=dropdown-menu-radio-item-indicator]]:size-5"
    closeOnClick
    data-slot="gemini-model-option"
    value={option.id}
  >
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="flex min-w-0 items-center gap-2">
        <span className="text-gemini-fg truncate text-sm leading-5 font-medium">
          {option.label}
        </span>
        {option.badge ? (
          <Badge className="bg-gemini-hover text-gemini-badge-fg! h-auto rounded-full border-0 px-2 py-0.5 text-[0.6875rem] leading-none font-medium">
            {option.badge}
          </Badge>
        ) : null}
      </span>
      <span className="text-gemini-muted! text-xs leading-4">
        {option.description}
      </span>
    </span>
  </DropdownMenuRadioItem>
);

export const GeminiModelSelector = ({
  className,
  defaultModel = GEMINI_DEFAULT_MODEL,
  model: modelProp,
  models = GEMINI_MODELS,
  onModelChange,
  ...props
}: GeminiModelSelectorProps) => {
  const [uncontrolledModel, setUncontrolledModel] = useState(defaultModel);
  const model = modelProp ?? uncontrolledModel;
  const selected = getGeminiModel(model, models);
  const coreModels = getGeminiModelsByGroup("core", models);
  const thinkingModels = getGeminiModelsByGroup("thinking", models);

  const handleSelect = (next: GeminiModelId) => {
    if (modelProp === undefined) {
      setUncontrolledModel(next);
    }
    onModelChange?.(next);
  };

  const renderRow = (option: GeminiModelOption) => (
    <GeminiModelRow key={option.id} option={option} />
  );

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Model: ${selected.label}`}
            className={cn(
              "group/gemini-model text-gemini-chip-fg dark:text-gemini-muted hover:bg-gemini-hover hover:text-gemini-chip-fg dark:hover:text-gemini-muted aria-expanded:bg-gemini-hover aria-expanded:text-gemini-chip-fg dark:aria-expanded:text-gemini-muted data-popup-open:bg-gemini-hover dark:hover:bg-gemini-hover focus-visible:ring-gemini-focus/30 h-9 shrink-0 gap-1 rounded-full border-0 ps-3.5 pe-2.5 text-[0.8125rem] leading-5 font-medium transition-[background-color,scale] duration-150 focus-visible:ring-2 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100",
              className
            )}
            data-slot="gemini-model-selector"
            variant="ghost"
            {...props}
          />
        }
      >
        <span className="font-medium">{selected.chip}</span>
        <ChevronDownIcon
          className="text-gemini-muted size-4 transition-transform duration-150 group-data-popup-open/gemini-model:rotate-180 motion-reduce:transition-none"
          strokeWidth={1.5}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-gemini-popover font-gemini text-gemini-fg shadow-gemini-popover w-72 rounded-[1.5rem] p-1.5 ring-0"
        side="top"
        sideOffset={10}
      >
        <DropdownMenuRadioGroup
          onValueChange={(next) => {
            const option = models.find((item) => item.id === next);
            if (option) {
              handleSelect(option.id);
            }
          }}
          value={selected.id}
        >
          {coreModels.map(renderRow)}
          {thinkingModels.length > 0 ? (
            <DropdownMenuSeparator className="bg-gemini-separator mx-2 my-1" />
          ) : null}
          {thinkingModels.map(renderRow)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
