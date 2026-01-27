"use client";

import {
  CreditCardIcon,
  PaintBoardIcon,
  Settings01Icon,
  UserCircleIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  useSidebar,
} from "@notra/ui/components/ui/sidebar";
import { cn } from "@notra/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavSettingsItem {
  name: string;
  url: string;
  icon: IconSvgElement;
}

const accountItems: NavSettingsItem[] = [
  {
    name: "Profile",
    url: "settings/account",
    icon: UserCircleIcon,
  },
];

const organizationItems: NavSettingsItem[] = [
  {
    name: "General",
    url: "settings/general",
    icon: Settings01Icon,
  },
  {
    name: "Members",
    url: "settings/members",
    icon: UserGroupIcon,
  },
  {
    name: "Billing",
    url: "billing",
    icon: CreditCardIcon,
  },
];

interface NavSettingsProps {
  slug: string;
}

export function NavSettings({ slug }: NavSettingsProps) {
  const pathname = usePathname();
  const { open } = useSidebar();

  const isActive = (url: string) => pathname === `/${slug}/${url}`;

  return (
    <>
      <SidebarGroup className={cn(open ? "px-4" : "px-2")}>
        <SidebarGroupLabel>Account</SidebarGroupLabel>
        <SidebarMenu>
          {accountItems.map((item) => (
            <SidebarMenuButton
              className={cn(
                "border border-transparent transition-colors duration-200 hover:bg-sidebar-accent",
                isActive(item.url)
                  ? "bg-sidebar-accent text-foreground"
                  : "hover:text-accent-foreground"
              )}
              key={item.name}
              render={
                <Link href={`/${slug}/${item.url}`}>
                  <HugeiconsIcon icon={item.icon} />
                  <span>{item.name}</span>
                </Link>
              }
              tooltip={item.name}
            />
          ))}
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup className={cn(open ? "px-4" : "px-2")}>
        <SidebarGroupLabel>Organization</SidebarGroupLabel>
        <SidebarMenu>
          {organizationItems.map((item) => (
            <SidebarMenuButton
              className={cn(
                "border border-transparent transition-colors duration-200 hover:bg-sidebar-accent",
                isActive(item.url)
                  ? "bg-sidebar-accent text-foreground"
                  : "hover:text-accent-foreground"
              )}
              key={item.name}
              render={
                <Link href={`/${slug}/${item.url}`}>
                  <HugeiconsIcon icon={item.icon} />
                  <span>{item.name}</span>
                </Link>
              }
              tooltip={item.name}
            />
          ))}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
