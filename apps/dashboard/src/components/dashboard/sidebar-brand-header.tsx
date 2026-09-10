"use client";

import { Notra } from "@notra/ui/components/ui/svgs/notra";

import { SidebarLabel } from "./sidebar-label";

export function SidebarBrandHeader() {
  return (
    <div className="flex h-8 items-center gap-2 px-2 group-data-[collapsible=icon]:px-0">
      <div className="bg-background flex size-7 shrink-0 items-center justify-center rounded-lg dark:bg-[#F6F3F1]">
        <Notra className="size-7 dark:size-5" />
      </div>
      <SidebarLabel className="text-base font-semibold">Notra</SidebarLabel>
    </div>
  );
}
