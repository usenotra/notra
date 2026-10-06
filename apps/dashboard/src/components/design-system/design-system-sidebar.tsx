"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@notra/ui/components/ui/sidebar";
import { Notra } from "@notra/ui/components/ui/svgs/notra";

import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import Link from "@/components/framework/link";
import {
  DESIGN_SYSTEM_CATEGORIES,
  DESIGN_SYSTEM_PAGES,
  DESIGN_SYSTEM_PATH,
} from "@/constants/design-system-catalog";
import { usePathname } from "@/lib/navigation";

export function DesignSystemSidebar({ activeId }: { activeId: string | null }) {
  const pathname = usePathname();
  const onIndex = pathname === DESIGN_SYSTEM_PATH;

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <Link
          className="flex h-8 items-center gap-2 px-2"
          href={DESIGN_SYSTEM_PATH}
        >
          <span className="bg-background flex size-7 shrink-0 items-center justify-center rounded-lg dark:bg-[#F6F3F1]">
            <Notra className="size-7 dark:size-5" />
          </span>
          <span className="text-base font-semibold">Notra UI</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {DESIGN_SYSTEM_CATEGORIES.map((category) => (
          <SidebarGroup key={category.id}>
            <SidebarGroupLabel>{category.label}</SidebarGroupLabel>
            <SidebarMenu>
              {category.items.map((item) => {
                const childActive =
                  item.children?.some((child) => child.id === activeId) ??
                  false;
                const expanded =
                  onIndex && (childActive || activeId === item.id);
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={onIndex && activeId === item.id}
                      render={<a href={`${DESIGN_SYSTEM_PATH}#${item.id}`} />}
                    >
                      {item.label}
                    </SidebarMenuButton>
                    {item.children && expanded ? (
                      <SidebarMenuSub>
                        {item.children.map((child) => (
                          <SidebarMenuSubItem key={child.id}>
                            <SidebarMenuSubButton
                              href={`${DESIGN_SYSTEM_PATH}#${child.id}`}
                              isActive={activeId === child.id}
                            >
                              {child.label}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
        <SidebarGroup>
          <SidebarGroupLabel>Playgrounds</SidebarGroupLabel>
          <SidebarMenu>
            {DESIGN_SYSTEM_PAGES.map((page) => (
              <SidebarMenuItem key={page.href}>
                <SidebarMenuButton
                  isActive={pathname === page.href}
                  render={<Link href={page.href} />}
                >
                  {page.label}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
