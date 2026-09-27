"use client";

import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Label } from "@notra/ui/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@notra/ui/components/ui/popover";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/button";
import { Calendar } from "@/components/calendar";
import type { GeoShelfDueDateFieldProps } from "@/types/geo-shelf";
import { formatShelfDueDate, shelfDueDateToIso } from "@/utils/geo-shelf";

export function ShelfDueDateField({
  id,
  dueAt,
  disabled,
  onChange,
}: GeoShelfDueDateFieldProps) {
  const t = useTranslations("geo.shelf.shelfDueDateField");
  const locale = useLocale();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t("due")}</Label>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              className="w-full justify-start gap-2 font-normal"
              disabled={disabled}
              id={id}
              variant="outline"
            />
          }
        >
          <HugeiconsIcon
            className="text-muted-foreground size-4"
            icon={Calendar03Icon}
          />
          {dueAt ? (
            formatShelfDueDate(dueAt, locale)
          ) : (
            <span className="text-muted-foreground">{t("pickDate")}</span>
          )}
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto overflow-hidden p-0"
          collisionAvoidance={{ fallbackAxisSide: "none" }}
          initialFocus={false}
          positionMethod="fixed"
          side="top"
        >
          <Calendar
            defaultMonth={dueAt ? new Date(dueAt) : undefined}
            disabled={disabled ? () => true : undefined}
            mode="single"
            onSelect={(date) => {
              if (!disabled) {
                onChange(date ? shelfDueDateToIso(date) : null);
              }
            }}
            selected={dueAt ? new Date(dueAt) : undefined}
          />
          {dueAt ? (
            <div className="flex justify-end border-t p-2">
              <Button
                disabled={disabled}
                onClick={() => {
                  if (!disabled) {
                    onChange(null);
                  }
                }}
                size="sm"
                variant="ghost"
              >
                {t("clearDueDate")}
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
