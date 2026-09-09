"use client";

import { ArrowDown01Icon, PlayIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useState } from "react";

import { Button } from "@/components/button";
import { EngineIcon } from "@/components/geo/engine-icon";
import type { GeoScanModelMenuProps } from "@/types/geo-scan-activity";
import { engineAnswerMode, formatEngineFamily } from "@/utils/geo-charts";

export function ScanModelMenu({
  engines,
  disabled,
  disabledReason,
  compact,
  primary,
  label = "Run scan",
  onContinue,
}: GeoScanModelMenuProps) {
  const [open, setOpen] = useState(false);
  const [excluded, setExcluded] = useState(() => new Set<string>());
  const selected = engines.filter((engine) => !excluded.has(engine));
  const variant = primary ? "default" : "outline";

  if (disabled || engines.length === 0) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={label}
              className="cursor-not-allowed opacity-50"
              disabled
              focusableWhenDisabled
              size={compact ? "icon" : "sm"}
              variant={compact ? "ghost" : variant}
            />
          }
        >
          <HugeiconsIcon aria-hidden="true" icon={PlayIcon} size={14} />
          {compact ? null : label}
        </TooltipTrigger>
        <TooltipContent>
          {disabledReason ??
            "Add a tracked model in GEO settings to run a scan."}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={label}
            className="active:scale-100"
            disabled={false}
            size={compact ? "icon" : "sm"}
            type="button"
            variant={compact ? "ghost" : variant}
          />
        }
      >
        <HugeiconsIcon aria-hidden="true" icon={PlayIcon} size={14} />
        {compact ? null : (
          <>
            {label}
            <HugeiconsIcon
              aria-hidden="true"
              icon={ArrowDown01Icon}
              size={14}
            />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="duration-fast w-72 max-w-[calc(100vw-2rem)] scale-100 opacity-100 transition-[opacity,scale] ease-out data-closed:animate-none data-ending-style:scale-95 data-ending-style:opacity-0 data-open:animate-none data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>Select models</DropdownMenuLabel>
          {engines.map((engine) => (
            <DropdownMenuCheckboxItem
              checked={!excluded.has(engine)}
              closeOnClick={false}
              key={engine}
              onCheckedChange={(checked) =>
                setExcluded((current) => {
                  const next = new Set(current);
                  if (checked) {
                    next.delete(engine);
                  } else {
                    next.add(engine);
                  }
                  return next;
                })
              }
            >
              <EngineIcon className="size-4" engine={engine} />
              <span className="min-w-0 flex-1 truncate">
                {formatEngineFamily(engine)}
              </span>
              <span className="text-muted-foreground text-xs">
                {engineAnswerMode(engine)}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="bg-primary text-primary-foreground focus:bg-primary/90 focus:text-primary-foreground h-7 justify-center rounded-md px-2 py-0 text-xs font-medium"
          disabled={selected.length === 0}
          onClick={() => {
            setOpen(false);
            onContinue(selected);
          }}
        >
          Continue with {selected.length}{" "}
          {selected.length === 1 ? "model" : "models"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
