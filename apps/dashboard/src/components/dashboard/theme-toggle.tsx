"use client";

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { SidebarMenuButton, useSidebar } from "@notra/ui/components/ui/sidebar";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { useTranslations } from "use-intl";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeToggle() {
  const t = useTranslations("nav.orgSelector");
  const { setTheme, resolvedTheme } = useTheme();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  const isDark = resolvedTheme === "dark";

  function handleToggle() {
    setTheme(isDark ? "light" : "dark");
  }

  if (!mounted) {
    return (
      <SidebarMenuButton>
        <div className="size-4" />
        {!isCollapsed && (
          <span className="text-sidebar-foreground flex-1 text-sm">
            {t("darkMode")}
          </span>
        )}
      </SidebarMenuButton>
    );
  }

  return (
    <SidebarMenuButton
      className="cursor-pointer"
      onClick={handleToggle}
      tooltip={isDark ? t("lightMode") : t("darkMode")}
    >
      <HugeiconsIcon
        className="size-4"
        icon={isDark ? Sun03Icon : Moon02Icon}
      />
      {!isCollapsed && (
        <>
          <span className="flex-1 text-left text-sm">
            {isDark ? t("lightMode") : t("darkMode")}
          </span>
          <Kbd className="ml-auto">D</Kbd>
        </>
      )}
    </SidebarMenuButton>
  );
}
