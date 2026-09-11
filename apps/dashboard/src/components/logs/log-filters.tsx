"use client";

import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@notra/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useState } from "react";

import { Button } from "@/components/button";
import {
  LOG_SEARCH_DEBOUNCE_MS,
  SOURCE_LABELS,
  SOURCE_VALUES,
  STATUS_LABELS,
  STATUS_VALUES,
} from "@/constants/logs";
import type { LogFiltersProps } from "@/types/logs/filters";
import { getSourceLabel, getStatusLabel } from "@/utils/logs";

export function LogFilters({
  search,
  source,
  status,
  onSearchChange,
  onSourceChange,
  onStatusChange,
  onRefresh,
  isFetching,
  hasData,
}: LogFiltersProps) {
  const [searchInput, setSearchInput] = useState(search);
  const [previousSearch, setPreviousSearch] = useState(search);
  if (search !== previousSearch) {
    setPreviousSearch(search);
    setSearchInput(search);
  }
  const commitSearch = useDebouncedCallback(onSearchChange, {
    wait: LOG_SEARCH_DEBOUNCE_MS,
  });
  const updateSearch = (value: string) => {
    setSearchInput(value);
    commitSearch(value);
  };
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <HugeiconsIcon
          className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          icon={Search01Icon}
        />
        <Input
          aria-label="Search logs"
          autoComplete="off"
          className="pr-8 pl-8"
          name="log-search"
          onChange={(event) => updateSearch(event.target.value)}
          placeholder="Search by title or error message"
          type="text"
          value={searchInput}
        />
        {searchInput.length > 0 ? (
          <button
            aria-label="Clear search"
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
            onClick={() => updateSearch("")}
            type="button"
          >
            <HugeiconsIcon
              aria-hidden="true"
              className="size-3.5"
              icon={Cancel01Icon}
            />
          </button>
        ) : null}
      </div>
      <Select
        onValueChange={(value) => onSourceChange(value ?? "all")}
        value={source}
      >
        <SelectTrigger aria-label="Filter by source" className="sm:w-44">
          <SelectValue>{(value: string) => getSourceLabel(value)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SOURCE_VALUES.map((value) => (
            <SelectItem key={value} value={value}>
              {SOURCE_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        onValueChange={(value) => onStatusChange(value ?? "all")}
        value={status}
      >
        <SelectTrigger aria-label="Filter by status" className="sm:w-40">
          <SelectValue>{(value: string) => getStatusLabel(value)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUS_VALUES.map((value) => (
            <SelectItem key={value} value={value}>
              {STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" disabled={isFetching} onClick={onRefresh}>
        {isFetching && hasData ? "Refreshing…" : "Refresh"}
      </Button>
    </div>
  );
}
