"use client";

import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@notra/ui/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useState } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import {
  LOG_SEARCH_DEBOUNCE_MS,
  SOURCE_VALUES,
  STATUS_VALUES,
} from "@/constants/logs";
import { useLogSourceLabel } from "@/lib/hooks/use-log-source-label";
import { useLogStatusLabels } from "@/lib/hooks/use-log-status-labels";
import type { LogFiltersProps } from "@/types/logs/filters";
import type { LogStatusFilter } from "@/types/webhooks/webhooks";
import { isLogSourceFilter, isLogStatusFilter } from "@/utils/log-labels";

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
  const t = useTranslations("logs");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  const statusLabels = useLogStatusLabels();
  const sourceLabel = useLogSourceLabel();
  const statusFilterLabel = (value: LogStatusFilter) =>
    value === "all" ? t("statusFilters.all") : statusLabels[value];
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
      <InputGroup className="flex-1">
        <InputGroupAddon>
          <HugeiconsIcon aria-hidden="true" icon={Search01Icon} />
        </InputGroupAddon>
        <InputGroupInput
          aria-label={t("filters.searchLabel")}
          autoComplete="off"
          name="log-search"
          onChange={(event) => updateSearch(event.target.value)}
          placeholder={t("filters.searchPlaceholder")}
          type="text"
          value={searchInput}
        />
        {searchInput.length > 0 ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label={tCommon2("labels.clearSearch")}
              onClick={() => updateSearch("")}
              size="icon-xs"
              type="button"
            >
              <HugeiconsIcon
                aria-hidden="true"
                className="size-3.5"
                icon={Cancel01Icon}
              />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
      <Select
        onValueChange={(value) => onSourceChange(value ?? "all")}
        value={source}
      >
        <SelectTrigger
          aria-label={tCommon2("labels.filterBySource")}
          className="sm:w-44"
        >
          <SelectValue>
            {(value: string) =>
              isLogSourceFilter(value) ? sourceLabel(value) : value
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SOURCE_VALUES.map((value) => (
            <SelectItem key={value} value={value}>
              {sourceLabel(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        onValueChange={(value) => onStatusChange(value ?? "all")}
        value={status}
      >
        <SelectTrigger
          aria-label={tCommon2("labels.filterByStatus")}
          className="sm:w-40"
        >
          <SelectValue>
            {(value: string) =>
              isLogStatusFilter(value) ? statusFilterLabel(value) : value
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUS_VALUES.map((value) => (
            <SelectItem key={value} value={value}>
              {statusFilterLabel(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" disabled={isFetching} onClick={onRefresh}>
        {isFetching && hasData
          ? tCommon2("labels.refreshing")
          : tCommon("refresh")}
      </Button>
    </div>
  );
}
