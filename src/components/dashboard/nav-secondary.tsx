"use client";

import { HelpCircleIcon, Settings01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface NavSecondaryItem {
  title: string;
  url: string;
  icon: IconSvgElement;
}

const items: readonly NavSecondaryItem[] = [
  {
    title: "Settings",
    url: "#",
    icon: Settings01Icon,
  },
  {
    title: "Get Help",
    url: "#",
    icon: HelpCircleIcon,
  },
];

export function NavSecondary({
  ...props
}: ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                render={
                  <Link href={item.url}>
                    <HugeiconsIcon icon={item.icon} />
                    <span>{item.title}</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
