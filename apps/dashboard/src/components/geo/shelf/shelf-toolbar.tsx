"use client";

import { SearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_SHELF_SHELF_FILTERS,
  GEO_SHELF_TICKET_FILTERS,
} from "@notra/schemas/constants/dashboard/geo-shelf";
import { Input } from "@notra/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";

import {
  GEO_SHELF_SHELF_FILTER_OPTIONS,
  GEO_SHELF_TICKET_FILTER_OPTIONS,
} from "@/constants/geo-shelf";
import type {
  GeoShelfShelfFilter,
  GeoShelfTicketFilter,
  GeoShelfToolbarProps,
} from "@/types/geo-shelf";

function toShelfFilter(value: string): GeoShelfShelfFilter {
  return GEO_SHELF_SHELF_FILTERS.find((option) => option === value) ?? "all";
}

function toTicketFilter(value: string): GeoShelfTicketFilter {
  return GEO_SHELF_TICKET_FILTERS.find((option) => option === value) ?? "any";
}

export function ShelfToolbar({
  filters,
  onSearchChange,
  onShelfFilterChange,
  onTicketFilterChange,
}: GeoShelfToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 basis-full sm:max-w-72 sm:basis-auto">
        <HugeiconsIcon
          className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
          icon={SearchIcon}
          size={15}
        />
        <Input
          aria-label="Filter shelves"
          className="pl-9 placeholder:truncate"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Filter shelves..."
          value={filters.search}
        />
      </div>
      <Select
        onValueChange={(value) =>
          onShelfFilterChange(toShelfFilter(value ?? "all"))
        }
        value={filters.shelf}
      >
        <SelectTrigger className="min-w-0 flex-1 sm:w-44 sm:flex-none">
          <SelectValue>
            {GEO_SHELF_SHELF_FILTER_OPTIONS.find(
              (option) => option.value === filters.shelf
            )?.label ?? "All shelves"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="w-72">
          {GEO_SHELF_SHELF_FILTER_OPTIONS.map((option) => (
            <SelectItem
              className="items-start py-1.5"
              key={option.value}
              value={option.value}
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span>{option.label}</span>
                <span className="text-muted-foreground text-xs whitespace-normal">
                  {option.description}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        onValueChange={(value) =>
          onTicketFilterChange(toTicketFilter(value ?? "any"))
        }
        value={filters.ticket}
      >
        <SelectTrigger className="min-w-0 flex-1 sm:w-44 sm:flex-none">
          <SelectValue>
            {GEO_SHELF_TICKET_FILTER_OPTIONS.find(
              (option) => option.value === filters.ticket
            )?.label ?? "Any ticket state"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {GEO_SHELF_TICKET_FILTER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
