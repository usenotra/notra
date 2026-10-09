import type { KeyboardEvent } from "react";

import { getNavbarMenuFocusIndex } from "@/utils/navbar-menu-focus";

export function handleNavbarTriggerKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  label: string,
  openGroup: (label: string, keyboard: boolean) => void
) {
  const expanded = event.currentTarget.getAttribute("aria-expanded") === "true";
  if (
    event.key !== "ArrowDown" &&
    event.key !== "ArrowUp" &&
    !(event.key === "Tab" && !event.shiftKey && expanded)
  ) {
    return;
  }
  event.preventDefault();
  const nav = event.currentTarget.closest("nav");
  const key = event.key;
  openGroup(label, true);
  requestAnimationFrame(() => {
    const items = nav
      ?.querySelector<HTMLElement>(`[id="desktop-navigation-${label}"]`)
      ?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    const index = key === "ArrowUp" ? (items?.length ?? 1) - 1 : 0;
    items?.[index]?.focus();
  });
}

export function handleNavbarMenuKeyDown(
  event: KeyboardEvent<HTMLDivElement>,
  closePanel: () => void
) {
  const items = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')
  );
  const index = items.indexOf(event.target as HTMLElement);
  if (
    event.key === "Tab" &&
    ((event.shiftKey && index === 0) ||
      (!event.shiftKey && index === items.length - 1))
  ) {
    const entries = Array.from(
      event.currentTarget
        .closest("nav")
        ?.querySelectorAll<HTMLElement>('[data-slot="navbar-entry"]') ?? []
    );
    const triggerIndex = entries.findIndex(
      (entry) => entry.getAttribute("aria-controls") === event.currentTarget.id
    );
    const target = entries[triggerIndex + (event.shiftKey ? 0 : 1)];
    if (triggerIndex !== -1 && target) {
      event.preventDefault();
      target.focus();
    }
    closePanel();
    return;
  }
  const next = getNavbarMenuFocusIndex(event.key, index, items.length);
  if (next !== undefined) {
    event.preventDefault();
    items[next]?.focus();
  }
}
