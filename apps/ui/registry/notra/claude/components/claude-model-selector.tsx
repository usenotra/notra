"use client";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  CLAUDE_MENU_ITEM_CLASS,
  CLAUDE_MENU_SURFACE_CLASS,
  CLAUDE_MODEL_MENU_CLOSE_DELAY_MS,
  CLAUDE_MODEL_MENU_OPEN_DELAY_MS,
} from "../constants/claude";
import { CLAUDE_EFFORTS, CLAUDE_MODELS } from "../constants/claude-models";
import {
  getClaudeEffort,
  getClaudeModel,
  getLatestClaudeModels,
  getPreviousClaudeModels,
} from "../lib/claude-models";
import type {
  ClaudeEffortId,
  ClaudeModelId,
  ClaudeModelSelectorProps,
} from "../types/claude";

const MENU_SURFACE_CLASS = cn(
  CLAUDE_MENU_SURFACE_CLASS,
  "w-75 p-2 shadow-[0_4px_24px_var(--claude-popover-shadow)]"
);

const ROW_CLASS = cn(
  CLAUDE_MENU_ITEM_CLASS,
  "focus:bg-claude-hover data-open:bg-claude-hover data-open:text-claude-fg data-popup-open:bg-claude-hover data-popup-open:text-claude-fg [&>svg:last-child]:text-claude-muted h-auto gap-2 rounded-xl px-3 py-2.5 text-base leading-6 [&>svg:last-child]:size-4"
);

const CHECK_CLASS =
  "pe-10 [&_[data-slot=dropdown-menu-radio-item-indicator]]:end-3 [&_[data-slot=dropdown-menu-radio-item-indicator]]:top-1/2 [&_[data-slot=dropdown-menu-radio-item-indicator]]:-translate-y-1/2 [&_[data-slot=dropdown-menu-radio-item-indicator]_svg]:text-claude-check [&_[data-slot=dropdown-menu-radio-item-indicator]_svg]:size-5";

const SEPARATOR_CLASS = "bg-claude-input-border mx-3 my-1";

const isEffortId = (value: unknown): value is ClaudeEffortId =>
  CLAUDE_EFFORTS.some((item) => item.id === value);

const isModelId = (value: unknown): value is ClaudeModelId =>
  CLAUDE_MODELS.some((item) => item.id === value);

export const ClaudeModelSelector = ({
  className,
  effort,
  effortLabel = "Effort",
  model,
  moreModelsLabel = "More models",
  onEffortChange,
  onModelChange,
}: ClaudeModelSelectorProps) => {
  const selectedModel = getClaudeModel(model);
  const selectedEffort = getClaudeEffort(effort);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        closeDelay={CLAUDE_MODEL_MENU_CLOSE_DELAY_MS}
        delay={CLAUDE_MODEL_MENU_OPEN_DELAY_MS}
        openOnHover
        render={
          <Button
            aria-label={`Model ${selectedModel.label}, effort ${selectedEffort.label}`}
            className={cn(
              "group/claude-model font-claude text-claude-fg hover:bg-claude-hover hover:text-claude-fg focus-visible:ring-claude-fg/20 aria-expanded:bg-claude-hover aria-expanded:text-claude-fg data-popup-open:bg-claude-hover dark:hover:bg-claude-hover h-7 gap-1.5 rounded-lg px-1.5 text-xs leading-5 font-normal focus-visible:border-transparent focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0",
              className
            )}
            data-slot="claude-model-selector"
            type="button"
            variant="ghost"
          />
        }
      >
        <span>{selectedModel.label}</span>
        <span className="text-claude-muted">{selectedEffort.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={MENU_SURFACE_CLASS}
        side="top"
        sideOffset={8}
      >
        <DropdownMenuRadioGroup
          onValueChange={(value) => {
            if (isModelId(value)) {
              onModelChange?.(value);
            }
          }}
          value={model}
        >
          {getLatestClaudeModels().map((item) => (
            <DropdownMenuRadioItem
              className={cn(ROW_CLASS, CHECK_CLASS)}
              key={item.id}
              value={item.id}
            >
              <span className="flex min-w-0 flex-col">
                <span className="text-claude-fg">{item.label}</span>
                <span className="text-claude-muted text-[0.9375rem] leading-6">
                  {item.description}
                </span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator className={SEPARATOR_CLASS} />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className={ROW_CLASS} openOnHover>
            <span>{effortLabel}</span>
            <span className="text-claude-muted ms-auto">
              {selectedEffort.label}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className={cn(MENU_SURFACE_CLASS, "w-auto min-w-44")}
            side="right"
            sideOffset={6}
          >
            <DropdownMenuRadioGroup
              onValueChange={(value) => {
                if (isEffortId(value)) {
                  onEffortChange?.(value);
                }
              }}
              value={effort}
            >
              {CLAUDE_EFFORTS.map((item) => (
                <DropdownMenuRadioItem
                  className={cn(ROW_CLASS, CHECK_CLASS)}
                  key={item.id}
                  value={item.id}
                >
                  {item.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator className={SEPARATOR_CLASS} />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className={ROW_CLASS} openOnHover>
            {moreModelsLabel}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className={cn(MENU_SURFACE_CLASS, "w-auto min-w-44")}
            side="right"
            sideOffset={6}
          >
            <DropdownMenuRadioGroup
              onValueChange={(value) => {
                if (isModelId(value)) {
                  onModelChange?.(value);
                }
              }}
              value={model}
            >
              {getPreviousClaudeModels().map((item) => (
                <DropdownMenuRadioItem
                  className={cn(ROW_CLASS, CHECK_CLASS)}
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
};
