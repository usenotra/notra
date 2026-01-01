"use client";

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

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
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2",
          isCollapsed && "justify-center px-0"
        )}
      >
        <div className="size-4" />
        {!isCollapsed && (
          <span className="flex-1 text-sidebar-foreground text-sm">
            Dark Mode
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isCollapsed && "justify-center px-0"
      )}
      onClick={handleToggle}
      type="button"
    >
      <HugeiconsIcon
        className="size-4"
        icon={isDark ? Sun03Icon : Moon02Icon}
      />
      {!isCollapsed && (
        <span className="flex-1 text-left text-sm">
          {isDark ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </button>
  );
}
