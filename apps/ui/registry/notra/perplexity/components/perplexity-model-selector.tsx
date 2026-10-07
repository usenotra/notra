"use client";

import { cn } from "cn";
import { ChevronDown, ChevronRight, LockKeyhole } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { PERPLEXITY_MODELS } from "../constants/perplexity";
import type {
  PerplexityModelBadge,
  PerplexityModelSelectorProps,
} from "../types/perplexity";
import { PerplexityModelIcon } from "./perplexity-model-icon";

const MODEL_ROW_CLASS =
  "text-pplx-subtle focus:bg-pplx-hover focus:text-pplx-fg data-highlighted:bg-pplx-hover [&_[data-slot=dropdown-menu-radio-item-indicator]]:text-pplx-fg h-9 cursor-pointer gap-2.5 rounded-[0.7rem] px-2.5 text-sm focus:**:text-inherit data-checked:pe-8";

const ModelBadge = ({ badge }: { badge: PerplexityModelBadge }) => (
  <Badge
    className={cn(
      "h-auto rounded-full border-0 px-1.5 py-px text-[9px] leading-none font-medium",
      badge === "max"
        ? "bg-pplx-badge text-pplx-badge-fg"
        : "bg-pplx-badge-new text-pplx-badge-new-fg"
    )}
  >
    {badge === "max" ? "Max" : "New"}
  </Badge>
);

export const PerplexityModelSelector = ({
  className,
  label = "Model",
  model,
  models = PERPLEXITY_MODELS,
  onModelChange,
  promoLabel = "Access the top AI models",
  ...props
}: PerplexityModelSelectorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu modal={false} onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Model"
            className={cn(
              "font-pplx text-pplx-muted hover:bg-pplx-hover hover:text-pplx-fg focus-visible:ring-pplx-ring aria-expanded:bg-pplx-hover aria-expanded:text-pplx-fg dark:hover:bg-pplx-hover h-8 shrink-0 gap-1 rounded-full border-0 bg-transparent px-3 text-sm leading-5 font-medium transition-[background-color,transform] duration-150 focus-visible:border-transparent focus-visible:ring-2 active:scale-[0.96] motion-reduce:transition-none",
              className
            )}
            data-slot="perplexity-model-selector"
            variant="ghost"
            {...props}
          />
        }
      >
        <span>{label}</span>
        <ChevronDown
          className={cn(
            "size-4 transition-transform duration-150 motion-reduce:transition-none",
            open && "rotate-180"
          )}
          strokeWidth={1.75}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-pplx-popover font-pplx text-pplx-fg w-80 min-w-80 rounded-[1.15rem] p-1.5 shadow-[0_8px_28px_rgb(0_0_0/0.12)] ring-0 dark:shadow-[0_8px_28px_rgb(0_0_0/0.45)]"
        side="top"
        sideOffset={10}
      >
        <DropdownMenuItem className="bg-pplx-promo text-pplx-fg focus:bg-pplx-promo-hover focus:text-pplx-fg data-highlighted:bg-pplx-promo-hover mb-0.5 h-9 justify-between gap-3 rounded-[0.85rem] px-3 text-sm font-medium">
          <span>{promoLabel}</span>
          <ChevronRight className="text-pplx-fg size-3.5" strokeWidth={1.75} />
        </DropdownMenuItem>
        <DropdownMenuRadioGroup
          onValueChange={(value: string) => onModelChange?.(value)}
          value={model ?? ""}
        >
          {models.map((item) => {
            const content = (
              <>
                <PerplexityModelIcon provider={item.provider} />
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="truncate">{item.label}</span>
                  {item.badge ? <ModelBadge badge={item.badge} /> : null}
                </span>
                {item.locked ? (
                  <LockKeyhole
                    aria-label="Locked"
                    className="text-pplx-lock size-3.5"
                    strokeWidth={1.75}
                  />
                ) : null}
              </>
            );

            // Locked models still highlight on hover like the real menu, they just can't be picked.
            return item.locked ? (
              <DropdownMenuItem
                aria-disabled="true"
                className={MODEL_ROW_CLASS}
                closeOnClick={false}
                data-locked=""
                key={item.id}
              >
                {content}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuRadioItem
                className={MODEL_ROW_CLASS}
                key={item.id}
                value={item.id}
              >
                {content}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
