"use client";

import { SearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@notra/ui/components/ui/command";
import { Kbd, KbdGroup } from "@notra/ui/components/ui/kbd";
import { useIsApplePlatform } from "@notra/ui/hooks/use-is-apple-platform";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useState } from "react";

import {
  DESIGN_SYSTEM_CATALOG,
  DESIGN_SYSTEM_CATEGORIES,
  DESIGN_SYSTEM_PAGES,
} from "@/constants/design-system-catalog";
import { usePathname, useRouter } from "@/lib/navigation";

export function DesignSystemSearch() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isApplePlatform = useIsApplePlatform();

  useHotkey("Mod+K", (event) => {
    event.preventDefault();
    setOpen((current) => !current);
  });

  const go = (href: string) => {
    setOpen(false);
    const [path, hash] = href.split("#");
    if (hash && path === pathname) {
      document.getElementById(hash)?.scrollIntoView({ block: "start" });
      window.history.replaceState(null, "", href);
      return;
    }
    router.push(href);
  };

  return (
    <>
      <button
        aria-label="Search components"
        className="text-muted-foreground hover:bg-muted/50 hover:text-foreground duration-fast inline-flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors md:hidden"
        onClick={() => setOpen(true)}
        type="button"
      >
        <HugeiconsIcon icon={SearchIcon} size={16} />
      </button>
      <button
        className="text-muted-foreground hover:bg-muted/50 duration-fast hidden h-8 w-full cursor-pointer items-center gap-2 rounded-lg border bg-transparent px-3 text-sm transition-colors md:flex"
        onClick={() => setOpen(true)}
        type="button"
      >
        <HugeiconsIcon className="shrink-0" icon={SearchIcon} size={16} />
        <span className="min-w-0 flex-1 truncate text-left">
          Search components
        </span>
        <KbdGroup className="hidden shrink-0 sm:flex">
          <Kbd>{isApplePlatform ? "⌘" : "Ctrl"}</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </button>
      <CommandDialog
        description="Jump to a section or playground."
        onOpenChange={setOpen}
        open={open}
        title="Search the design system"
      >
        <Command>
          <CommandInput placeholder="Search components…" />
          <CommandList>
            <CommandEmpty>No matching section.</CommandEmpty>
            {DESIGN_SYSTEM_CATEGORIES.map((category) => (
              <CommandGroup heading={category.label} key={category.id}>
                {DESIGN_SYSTEM_CATALOG.filter(
                  (entry) => entry.categoryId === category.id
                ).map((entry) => (
                  <CommandItem
                    key={entry.id}
                    onSelect={() => go(entry.href)}
                    value={`${entry.parentLabel ?? ""} ${entry.label} ${entry.id}`}
                  >
                    {entry.parentLabel ? (
                      <span className="text-muted-foreground">
                        {entry.parentLabel} ·
                      </span>
                    ) : null}
                    {entry.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            <CommandGroup heading="Playgrounds">
              {DESIGN_SYSTEM_PAGES.map((page) => (
                <CommandItem
                  key={page.href}
                  onSelect={() => go(page.href)}
                  value={`playground ${page.label}`}
                >
                  {page.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
