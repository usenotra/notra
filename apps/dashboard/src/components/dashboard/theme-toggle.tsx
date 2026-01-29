"use client";

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SidebarMenuButton, useSidebar } from "@notra/ui/components/ui/sidebar";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  function handleToggle() {
    setTheme(isDark ? "light" : "dark");
  }

  if (!mounted) {
    return (
      <SidebarMenuButton>
        <div className="size-4" />
        {!isCollapsed && (
          <span className="flex-1 text-sidebar-foreground text-sm">
            Dark Mode
          </span>
        )}
      </SidebarMenuButton>
    );
  }

  return (
    <SidebarMenuButton onClick={handleToggle} className="cursor-pointer">
      <HugeiconsIcon
        className="size-4"
        icon={isDark ? Sun03Icon : Moon02Icon}
      />
      {!isCollapsed && (
        <span className="flex-1 text-left text-sm">
          {isDark ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </SidebarMenuButton>
  );
}
