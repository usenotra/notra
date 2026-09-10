"use client";

import { Cancel01Icon, SearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@notra/ui/components/ui/input";
import { cn } from "@notra/ui/lib/utils";
import { type KeyboardEvent, useState } from "react";

import type {
  SettingsModalNavProps,
  SettingsNavItem,
  SettingsSectionId,
} from "@/types/settings/modal";

function HighlightedLabel({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return text;
  }

  const lower = text.toLowerCase();
  const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  let match: { start: number; length: number } | null = null;
  for (const token of tokens) {
    const index = lower.indexOf(token);
    if (index < 0) {
      continue;
    }
    if (
      match === null ||
      index < match.start ||
      (index === match.start && token.length > match.length)
    ) {
      match = { start: index, length: token.length };
    }
  }
  if (!match) {
    return text;
  }

  return (
    <>
      {text.slice(0, match.start)}
      <span className="text-foreground font-medium">
        {text.slice(match.start, match.start + match.length)}
      </span>
      {text.slice(match.start + match.length)}
    </>
  );
}

export function SettingsModalNav({
  groups,
  activeSection,
  query,
  onQueryChange,
  onSelect,
  searchInputId,
}: SettingsModalNavProps) {
  const isSearching = query.trim().length > 0;
  const flatItems = groups.flatMap((group) => group.items);
  const [navFocus, setNavFocus] = useState({ query, index: 0 });
  const lastIndex = Math.max(0, flatItems.length - 1);
  const focusedIndex =
    navFocus.query === query ? Math.min(navFocus.index, lastIndex) : 0;
  const focusedId = flatItems[focusedIndex]?.id;

  function setFocusedIndex(nextIndex: number) {
    setNavFocus({ query, index: nextIndex });
  }

  function selectItem(id: SettingsSectionId) {
    onSelect(id);
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && isSearching) {
      event.preventDefault();
      event.stopPropagation();
      onQueryChange("");
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (flatItems.length === 0) {
        return;
      }
      setFocusedIndex((focusedIndex + 1) % flatItems.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (flatItems.length === 0) {
        return;
      }
      setFocusedIndex(
        focusedIndex <= 0 ? flatItems.length - 1 : focusedIndex - 1
      );
      return;
    }
    if (event.key === "Enter") {
      const focused = flatItems[focusedIndex];
      if (!focused) {
        return;
      }
      event.preventDefault();
      selectItem(focused.id);
    }
  }

  return (
    <nav
      aria-label="Settings"
      className="flex min-h-0 w-full shrink-0 flex-col border-b md:w-56 md:border-r md:border-b-0"
    >
      <div className="p-3 pb-2">
        <div className="relative">
          <HugeiconsIcon
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
            icon={SearchIcon}
            strokeWidth={2}
          />
          <Input
            aria-activedescendant={
              isSearching && focusedId
                ? `${searchInputId}-${focusedId}`
                : undefined
            }
            aria-controls={`${searchInputId}-results`}
            aria-label="Search settings"
            autoComplete="off"
            autoFocus
            className={cn(
              "bg-muted/50 h-8 pl-8",
              isSearching ? "pr-8" : "pr-2.5"
            )}
            id={searchInputId}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search settings"
            spellCheck={false}
            type="text"
            value={query}
          />
          {isSearching ? (
            <button
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm"
              onClick={() => onQueryChange("")}
              type="button"
            >
              <HugeiconsIcon className="size-3" icon={Cancel01Icon} />
            </button>
          ) : null}
        </div>
      </div>
      <div
        className="flex min-h-0 flex-1 flex-row gap-3 overflow-x-auto overflow-y-hidden px-2 pb-2 md:flex-col md:gap-4 md:overflow-x-hidden md:overflow-y-auto md:px-2 md:pb-3"
        id={`${searchInputId}-results`}
        role={isSearching ? "listbox" : undefined}
      >
        {groups.length === 0 ? (
          <p className="text-muted-foreground px-2 py-3 text-xs">
            No matching settings
          </p>
        ) : (
          groups.map((group) => (
            <div
              className="flex min-w-max flex-col gap-1 md:min-w-0"
              key={group.id}
            >
              <p className="text-muted-foreground px-2 pt-1 text-[11px] font-medium tracking-wide uppercase">
                {group.label}
              </p>
              <div className="flex flex-row gap-1 md:flex-col">
                {group.items.map((item) => {
                  const isActive = item.id === activeSection;
                  const isFocused = isSearching && item.id === focusedId;
                  return (
                    <SettingsNavButton
                      id={`${searchInputId}-${item.id}`}
                      isActive={isActive}
                      isFocused={isFocused}
                      isSearching={isSearching}
                      item={item}
                      key={item.id}
                      onSelect={selectItem}
                      query={query}
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </nav>
  );
}

function SettingsNavButton({
  id,
  item,
  isActive,
  isFocused,
  isSearching,
  onSelect,
  query,
}: {
  id: string;
  item: SettingsNavItem;
  isActive: boolean;
  isFocused: boolean;
  isSearching: boolean;
  onSelect: (section: SettingsSectionId) => void;
  query: string;
}) {
  return (
    <button
      aria-current={isActive ? "page" : undefined}
      aria-selected={isSearching ? isFocused : undefined}
      className={cn(
        "duration-fast flex min-h-8 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors",
        "hover:bg-muted/80",
        isActive || isFocused
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground",
        isSearching && "items-start"
      )}
      id={id}
      onClick={() => onSelect(item.id)}
      role={isSearching ? "option" : undefined}
      type="button"
    >
      <HugeiconsIcon
        className={cn("size-4 shrink-0", isSearching && "mt-0.5")}
        icon={item.icon}
        strokeWidth={isActive || isFocused ? 2 : 1.5}
      />
      <span className="min-w-0">
        <span className="block truncate">
          <HighlightedLabel query={query} text={item.label} />
        </span>
        {isSearching ? (
          <span className="text-muted-foreground mt-0.5 block truncate text-[11px] leading-tight">
            {item.description}
          </span>
        ) : null}
      </span>
    </button>
  );
}
