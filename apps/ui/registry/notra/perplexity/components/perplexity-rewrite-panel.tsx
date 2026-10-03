"use client";

import { cn } from "cn";
import {
  ArrowRight,
  BookOpen,
  Check,
  LockKeyhole,
  Search,
  Telescope,
} from "lucide-react";
import { useState } from "react";
import type { ComponentType, SVGProps } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import {
  PERPLEXITY_MODELS,
  PERPLEXITY_REWRITE_MODES,
} from "../constants/perplexity";
import type {
  PerplexityModel,
  PerplexityRewriteModeId,
  PerplexityRewritePanelProps,
} from "../types/perplexity";
import { PerplexityModelIcon } from "./perplexity-model-icon";

const ICON_STROKE = 1.75;

const MODE_ICONS: Record<
  PerplexityRewriteModeId,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  "deep-research": Telescope,
  learn: BookOpen,
  search: Search,
};

const ROW_CLASS =
  "text-pplx-fg hover:bg-pplx-hover hover:text-pplx-fg focus-visible:ring-pplx-ring dark:hover:bg-pplx-hover h-9 w-full justify-start gap-3 rounded-xl border-0 px-3 text-[0.9375rem] leading-5 font-normal focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0";

const ModelBadge = ({
  badge,
}: {
  badge: NonNullable<PerplexityModel["badge"]>;
}) => (
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

export const PerplexityRewritePanel = ({
  className,
  defaultMode = "search",
  modes = PERPLEXITY_REWRITE_MODES,
  models = PERPLEXITY_MODELS,
  onClose,
  onRewrite,
  promoLabel = "Access the top AI models",
  ...props
}: PerplexityRewritePanelProps) => {
  const [mode, setMode] = useState<PerplexityRewriteModeId>(defaultMode);

  return (
    <div
      className={cn(
        "font-pplx text-pplx-fg flex w-72 flex-col gap-1",
        className
      )}
      data-slot="perplexity-rewrite-panel"
      {...props}
    >
      <ToggleGroup
        aria-label="Mode"
        className="w-full rounded-none"
        onValueChange={(next) => {
          const chosen = modes.find((item) => item.id === next[0]);
          if (chosen && !chosen.locked) {
            setMode(chosen.id);
          }
        }}
        orientation="vertical"
        spacing={0}
        value={[mode]}
      >
        {modes.map((item) => {
          const Icon = MODE_ICONS[item.id];
          return (
            <ToggleGroupItem
              aria-disabled={item.locked || undefined}
              className={cn(
                ROW_CLASS,
                "aria-pressed:bg-transparent data-pressed:bg-transparent",
                item.locked && "text-pplx-subtle hover:text-pplx-subtle"
              )}
              key={item.id}
              value={item.id}
            >
              <Icon className="size-4 shrink-0" strokeWidth={ICON_STROKE} />
              <span className="flex-1 text-start">{item.label}</span>
              {item.locked ? (
                <LockKeyhole
                  aria-label="Locked"
                  className="text-pplx-lock size-3.5"
                  strokeWidth={ICON_STROKE}
                />
              ) : null}
              {item.id === mode ? (
                <Check
                  aria-hidden="true"
                  className="text-pplx-badge-new-fg size-4"
                  strokeWidth={2}
                />
              ) : null}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
      <Separator className="bg-pplx-border my-1" />
      <Button
        className="bg-pplx-promo text-pplx-fg hover:bg-pplx-promo-hover hover:text-pplx-fg focus-visible:ring-pplx-ring dark:hover:bg-pplx-promo-hover h-9 w-full justify-between gap-3 rounded-xl border-0 px-3 text-[0.9375rem] leading-5 font-normal focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0"
        variant="ghost"
      >
        <span>{promoLabel}</span>
        <ArrowRight
          aria-hidden="true"
          className="text-pplx-badge-new-fg size-4"
          strokeWidth={ICON_STROKE}
        />
      </Button>
      <ScrollArea className="h-52">
        <ItemGroup className="gap-0 pe-2">
          {models.map((item) => (
            <Item
              data-locked={item.locked || undefined}
              className="text-pplx-subtle hover:bg-pplx-hover h-9 flex-nowrap gap-3 rounded-xl border-0 px-3 py-0 text-[0.9375rem] leading-5"
              key={item.id}
              role="listitem"
            >
              <ItemMedia className="size-4 translate-y-0 self-center">
                <PerplexityModelIcon provider={item.provider} />
              </ItemMedia>
              <ItemContent className="min-w-0 flex-row items-center gap-2">
                <ItemTitle className="text-pplx-subtle line-clamp-none block w-auto truncate text-[0.9375rem] leading-5 font-normal">
                  {item.label}
                </ItemTitle>
                {item.badge ? <ModelBadge badge={item.badge} /> : null}
              </ItemContent>
              {item.locked ? (
                <ItemActions>
                  <LockKeyhole
                    aria-label="Locked"
                    className="text-pplx-lock size-3.5"
                    strokeWidth={ICON_STROKE}
                  />
                </ItemActions>
              ) : null}
            </Item>
          ))}
        </ItemGroup>
      </ScrollArea>
      <Button
        className="bg-pplx-send text-pplx-send-fg hover:bg-pplx-send-hover hover:text-pplx-send-fg focus-visible:ring-pplx-ring mt-1 h-10 w-full rounded-xl border-0 text-[0.9375rem] font-medium focus-visible:ring-2 active:not-aria-[haspopup]:translate-y-0"
        onClick={() => {
          onRewrite?.({ mode });
          onClose?.();
        }}
      >
        Rewrite
      </Button>
    </div>
  );
};
