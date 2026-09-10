"use client";

import { cn } from "@notra/ui/lib/utils";
import { useLayoutEffect } from "react";

import { useSettingsHeaderOptional } from "@/components/settings/settings-header-context";
import type { SettingsPaneProps } from "@/types/settings/modal";

export function SettingsPane({
  children,
  className,
  titleAccessory = null,
}: SettingsPaneProps) {
  const setTitleAccessory = useSettingsHeaderOptional()?.setTitleAccessory;

  useLayoutEffect(() => {
    if (!setTitleAccessory) {
      return;
    }
    setTitleAccessory(titleAccessory);
    return () => {
      setTitleAccessory(null);
    };
  }, [setTitleAccessory, titleAccessory]);

  return <div className={cn("space-y-6", className)}>{children}</div>;
}
